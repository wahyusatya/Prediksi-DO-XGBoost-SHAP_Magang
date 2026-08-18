"""
Siprido EIS - FastAPI REST API Server
======================================
Endpoint utama:
  GET  /api/v1/mahasiswa                  → List mahasiswa + skor prediksi DO
  GET  /api/v1/mahasiswa/{nim}/detail     → Detail SHAP explanation per mahasiswa
  POST /api/v1/mahasiswa/bulk-sync        → Integrasi SIAKAD / IES eksternal
  POST /api/v1/admin/retrain              → MLOps Hot Retraining
  GET  /api/v1/analytics/macro-insights   → Agregasi faktor risiko tingkat makro
  GET  /api/v1/mahasiswa/{nim}/intervensi → Riwayat bimbingan akademik DPA
  POST /api/v1/mahasiswa/{nim}/intervensi → Catatan intervensi baru DPA
"""

import os
from contextlib import asynccontextmanager
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text

from database import engine
from train_model import train_and_save_model


# ============================================================
# Pydantic Schemas (Request Models)
# ============================================================
class MahasiswaSyncItem(BaseModel):
    nim: str
    nama: str
    fakultas_prodi: str
    smt: int = 2
    ips_smt1: float
    ips_smt2: float
    golongan_ukt: int = 1
    status_cuti: int = 0
    kode_wilayah: int = 1
    asal_daerah: Optional[str] = "-"
    persen_kehadiran_smt2: Optional[float] = 100.0
    mk_cekal_uas_smt2: Optional[int] = 0


class SIAKADBulkSyncRequest(BaseModel):
    data: List[MahasiswaSyncItem]


class IntervensiCreateRequest(BaseModel):
    jenis_tindakan: str = Field(..., example="Bimbingan Akademik DPA")
    catatan: str = Field(..., example="Mahasiswa diberikan konseling akademik dan pengajuan keringanan UKT.")
    petugas: str = Field(default="DPA / Akademik", example="Dr. Wayan (DPA)")


# ============================================================
# Konstanta & Konfigurasi
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "model_xgboost.joblib")

FEATURE_COLUMNS = [
    "ips_smt1",
    "ips_smt2",
    "delta_ips",
    "golongan_ukt",
    "status_cuti",
    "kode_wilayah",
    "persen_kehadiran_smt2",
    "mk_cekal_uas_smt2",
]

FEATURE_LABELS = {
    "ips_smt1": "IPS Semester 1",
    "ips_smt2": "IPS Semester 2",
    "delta_ips": "Perubahan IPS (Semester 1 ke 2)",
    "golongan_ukt": "Golongan UKT",
    "status_cuti": "Riwayat Cuti Akademik",
    "kode_wilayah": "Asal Wilayah",
    "persen_kehadiran_smt2": "Tingkat Kehadiran Kuliah",
    "mk_cekal_uas_smt2": "Jumlah MK Cekal UAS (<75% Hadir)",
}

WILAYAH_LABELS = {
    1: "Dalam Kec. Buleleng, Kab. Buleleng",
    2: "Luar Kec. Buleleng, Kab. Buleleng",
    3: "Luar Kec. & Kab. Buleleng",
}

FEATURE_PILLAR = {
    "ips_smt1": "Akademik",
    "ips_smt2": "Akademik",
    "delta_ips": "Akademik",
    "mk_cekal_uas_smt2": "Akademik",
    "golongan_ukt": "Finansial & Wilayah",
    "kode_wilayah": "Finansial & Wilayah",
    "persen_kehadiran_smt2": "Kedisiplinan & Keaktifan",
    "status_cuti": "Kedisiplinan & Keaktifan",
}

PILLAR_AUTHORITIES = {
    "Akademik": "WR I / Dekan / Kaprodi",
    "Finansial & Wilayah": "WR II / Biro Keuangan / BAAK",
    "Kedisiplinan & Keaktifan": "WR III / DPA",
}

# Pre-compiled SQL statements
QUERY_UPSERT_PREDIKSI = text("""
    INSERT INTO prediksi_do (nim, skor_prediksi, status_risiko, updated_at)
    VALUES (:nim, :skor, :status, NOW())
    ON CONFLICT (nim) DO UPDATE
    SET skor_prediksi = EXCLUDED.skor_prediksi,
        status_risiko = EXCLUDED.status_risiko,
        updated_at = NOW();
""")

QUERY_UPSERT_MHS = text("""
    INSERT INTO data_mahasiswa_smt2
        (nim, nama, fakultas_prodi, smt, ips_smt1, ips_smt2, golongan_ukt, status_cuti, kode_wilayah, asal_daerah, persen_kehadiran_smt2, mk_cekal_uas_smt2)
    VALUES
        (:nim, :nama, :fakultas_prodi, :smt, :ips_smt1, :ips_smt2, :golongan_ukt, :status_cuti, :kode_wilayah, :asal_daerah, :persen_kehadiran_smt2, :mk_cekal_uas_smt2)
    ON CONFLICT (nim) DO UPDATE
    SET nama = EXCLUDED.nama,
        fakultas_prodi = EXCLUDED.fakultas_prodi,
        smt = EXCLUDED.smt,
        ips_smt1 = EXCLUDED.ips_smt1,
        ips_smt2 = EXCLUDED.ips_smt2,
        golongan_ukt = EXCLUDED.golongan_ukt,
        status_cuti = EXCLUDED.status_cuti,
        kode_wilayah = EXCLUDED.kode_wilayah,
        asal_daerah = EXCLUDED.asal_daerah,
        persen_kehadiran_smt2 = EXCLUDED.persen_kehadiran_smt2,
        mk_cekal_uas_smt2 = EXCLUDED.mk_cekal_uas_smt2;
""")

QUERY_MHS_DETAIL = text("""
    SELECT
        m.nim, m.nama, m.fakultas_prodi, m.smt,
        m.ips_smt1, m.ips_smt2,
        m.golongan_ukt, m.status_cuti, m.kode_wilayah,
        m.asal_daerah,
        m.persen_kehadiran_smt2, m.mk_cekal_uas_smt2
    FROM data_mahasiswa_smt2 m
    WHERE m.nim = :nim
""")

QUERY_GET_INTERVENSI = text("""
    SELECT id, nim, tanggal, jenis_tindakan, catatan, petugas
    FROM intervensi_mahasiswa
    WHERE nim = :nim
    ORDER BY tanggal DESC
""")

QUERY_INSERT_INTERVENSI = text("""
    INSERT INTO intervensi_mahasiswa (nim, jenis_tindakan, catatan, petugas, tanggal)
    VALUES (:nim, :jenis_tindakan, :catatan, :petugas, NOW())
    RETURNING id, nim, tanggal, jenis_tindakan, catatan, petugas;
""")

QUERY_CHECK_MHS_EXISTS = text("SELECT 1 FROM data_mahasiswa_smt2 WHERE nim = :nim")

# Global State (diisi saat startup)
model = None


# ============================================================
# Lifespan (startup & shutdown)
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model saat server startup."""
    global model
    print("[Startup] Memuat model dari", MODEL_PATH)
    model = joblib.load(MODEL_PATH)
    print("[Startup] Model berhasil dimuat.")
    yield
    print("[Shutdown] Server dimatikan.")


# ============================================================
# Inisialisasi FastAPI
# ============================================================
app = FastAPI(
    title="Siprido EIS API",
    description="REST API untuk Sistem Informasi Eksekutif Prediksi Drop Out Mahasiswa",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Helper Functions
# ============================================================
def _klasifikasi_risiko(skor: int) -> str:
    """Mengklasifikasikan skor prediksi menjadi status risiko."""
    if skor >= 70:
        return "Tinggi"
    elif skor >= 40:
        return "Sedang"
    return "Rendah"


def _prepare_df(records: list[dict]) -> pd.DataFrame:
    """Menyiapkan DataFrame fitur dari list record mahasiswa secara konsisten."""
    df = pd.DataFrame(records)
    df["ips_smt1"] = df["ips_smt1"].astype(float)
    df["ips_smt2"] = df["ips_smt2"].astype(float)
    df["delta_ips"] = df["ips_smt2"] - df["ips_smt1"]
    df["persen_kehadiran_smt2"] = df["persen_kehadiran_smt2"].fillna(100.0).astype(float)
    df["mk_cekal_uas_smt2"] = df["mk_cekal_uas_smt2"].fillna(0).astype(int)
    return df


def _calc_do_score(proba_raw: float, data: dict) -> tuple[int, str]:
    """
    Menghitung skor prediksi DO secara konsisten untuk dashboard & detail.
    Menggunakan kombinasi probabilitas XGBoost dan pembobotan multi-faktor kontinu.
    """
    ips1 = float(data.get("ips_smt1", 0.0))
    ips2 = float(data.get("ips_smt2", 0.0))
    delta = float(data.get("delta_ips", ips2 - ips1))
    cuti = int(data.get("status_cuti", 0))
    ukt = int(data.get("golongan_ukt", 1))
    wilayah = int(data.get("kode_wilayah", 1))
    kehadiran = float(data.get("persen_kehadiran_smt2", 100.0))
    mk_cekal = int(data.get("mk_cekal_uas_smt2", 0))

    if ips1 < 3.00:
        base = 70.0 + (3.00 - ips1) * 8.0 + cuti * 4.0 + mk_cekal * 2.0 + max(0.0, (75.0 - kehadiran) * 0.25) + (ukt - 1) * 0.7 + (wilayah - 1) * 1.0
        final_float = min(98.0, max(70.0, 0.40 * (proba_raw * 100) + 0.60 * base))
    else:
        has_trigger = (
            (cuti >= 1)
            or (mk_cekal >= 1)
            or (kehadiran < 80.0)
            or (delta < -0.15)
            or (ukt >= 4 and delta < 0)
            or (ukt >= 3 and wilayah >= 2)
        )
        if has_trigger:
            base = 40.0 + cuti * 10.0 + mk_cekal * 6.0 + max(0.0, (85.0 - kehadiran) * 0.4) + (abs(delta) * 18.0 if delta < 0 else 0.0) + (ukt - 1) * 1.8 + (wilayah - 1) * 2.5
            final_float = min(69.0, max(40.0, base))
        else:
            base = 25.0 - (ips1 - 3.00) * 12.0 - (ips2 - 3.00) * 8.0 - (max(0.0, kehadiran - 85.0) * 0.5) + (ukt - 1) * 1.5
            final_float = min(39.0, max(5.0, 0.50 * (proba_raw * 100) + 0.50 * base))

    skor_do = int(round(final_float))
    return skor_do, _klasifikasi_risiko(skor_do)


def _compute_shap_values(X: pd.DataFrame):
    """
    Menghitung SHAP values menggunakan XGBoost built-in pred_contribs.
    Mengembalikan (shap_values_per_fitur, base_value).
    """
    booster = model.get_booster()
    dmatrix = xgb.DMatrix(X, feature_names=FEATURE_COLUMNS)
    contribs = booster.predict(dmatrix, pred_contribs=True)
    return contribs[0, :-1], contribs[0, -1]


def _calc_feature_weight(feat: str, sv: float, rv: float) -> float:
    """Menghitung weighted importance SHAP untuk faktor pemicu."""
    w = abs(sv)
    if feat == "status_cuti" and rv >= 1:
        w += 0.60 + (rv - 1) * 0.40
    elif feat == "golongan_ukt" and rv >= 5:
        w += 0.45 * (rv - 4)
    elif feat == "kode_wilayah" and rv == 3:
        w += 0.75
    elif feat == "kode_wilayah" and rv == 2:
        w += 0.35
    elif feat == "delta_ips" and rv < 0:
        w += abs(rv) * 1.5
    elif feat == "mk_cekal_uas_smt2" and rv >= 2:
        w += 0.70 + (rv - 2) * 0.25
    elif feat == "mk_cekal_uas_smt2" and rv == 1:
        w += 0.30
    elif feat == "persen_kehadiran_smt2" and rv < 75:
        w += (75 - rv) / 50 * 1.2
    return w


def _get_kontribusi(feat: str, sv: float, rv: float) -> str:
    """Menentukan narasi arah kontribusi faktor terhadap risiko DO."""
    if sv > 0:
        return "Meningkatkan risiko DO"
    if sv < 0:
        return "Menurunkan risiko DO"
    if (feat == "delta_ips" and rv < 0) or (feat in ("ips_smt1", "ips_smt2") and rv < 3.0) or \
       (feat == "status_cuti" and rv >= 1) or (feat == "golongan_ukt" and rv >= 5) or \
       (feat == "kode_wilayah" and rv >= 2) or (feat == "persen_kehadiran_smt2" and rv < 75) or \
       (feat == "mk_cekal_uas_smt2" and rv >= 1):
        return "Meningkatkan risiko DO"
    return "Netral terhadap risiko DO"


def _generate_recommendations(top_factors: list, mhs_data: dict) -> list:
    """
    Mesin Rekomendasi Preskriptif berbasis rule-based heuristics.
    Menganalisis Top 3 faktor pemicu dan menghasilkan rekomendasi tindakan.
    """
    recommendations = []
    seen_actions = set()

    def add_rec(pilar: str, action: str, prioritas: str):
        if action not in seen_actions:
            seen_actions.add(action)
            recommendations.append({
                "pilar": pilar,
                "otoritas": PILLAR_AUTHORITIES[pilar],
                "tindakan": action,
                "prioritas": prioritas,
            })

    kehadiran = float(mhs_data.get("persen_kehadiran_smt2", 100.0))
    mk_cekal = int(mhs_data.get("mk_cekal_uas_smt2", 0))
    ukt = int(mhs_data.get("golongan_ukt", 1))
    wilayah = int(mhs_data.get("kode_wilayah", 1))
    ips1 = float(mhs_data.get("ips_smt1", 0))
    ips2 = float(mhs_data.get("ips_smt2", 0))
    delta = ips2 - ips1
    cuti = int(mhs_data.get("status_cuti", 0))

    top_features = {f["feature"] for f in top_factors}

    # Rule 1: Kehadiran Rendah / MK Cekal
    if ("persen_kehadiran_smt2" in top_features and kehadiran < 80) or \
       ("mk_cekal_uas_smt2" in top_features and mk_cekal >= 1):
        add_rec(
            "Kedisiplinan & Keaktifan",
            "Lakukan pemanggilan mahasiswa oleh Dosen Pembimbing Akademik (DPA) "
            "untuk konseling kedisiplinan. Verifikasi kendala absensi kelas "
            "(masalah transportasi, kesehatan, atau jadwal kerja). "
            "Koordinasi dengan Kaprodi untuk monitoring kehadiran mingguan.",
            "Kritis" if kehadiran < 60 or mk_cekal >= 3 else "Penting",
        )

    # Rule 2: UKT Tinggi & Wilayah Jauh
    if ("golongan_ukt" in top_features and ukt >= 4) or \
       ("kode_wilayah" in top_features and wilayah >= 2):
        add_rec(
            "Finansial & Wilayah",
            "Verifikasi kelayakan bantuan beasiswa atau pengajuan keringanan "
            "penyesuaian UKT oleh BAAK/WR II. Pertimbangkan program bantuan "
            "transportasi atau asrama bagi mahasiswa asal luar daerah. "
            "Evaluasi kondisi sosial-ekonomi keluarga untuk intervensi finansial.",
            "Kritis" if ukt >= 6 and wilayah >= 3 else "Penting",
        )

    # Rule 3: Penurunan IPS / IPS Rendah
    if ("delta_ips" in top_features and delta < 0) or \
       ("ips_smt1" in top_features and ips1 < 2.75) or \
       ("ips_smt2" in top_features and ips2 < 2.75):
        add_rec(
            "Akademik",
            "Rekomendasikan program pendampingan tutorial sebaya (peer-tutoring) "
            "atau remedial terarah di tingkat prodi. Identifikasi mata kuliah "
            "dengan nilai terburuk untuk intervensi spesifik. "
            "Libatkan Kaprodi untuk menyusun rencana pemulihan akademik.",
            "Kritis" if ips2 < 2.0 or delta < -0.5 else "Penting",
        )

    # Rule 4: Cuti Berulang
    if "status_cuti" in top_features and cuti >= 1:
        add_rec(
            "Kedisiplinan & Keaktifan",
            "Agendakan audiensi khusus untuk evaluasi status studi dan "
            "penyusunan rencana kelulusan. Eksplorasi penyebab cuti "
            "(finansial, kesehatan, keluarga) untuk intervensi holistik. "
            "Pertimbangkan perpanjangan masa studi dengan monitoring ketat.",
            "Kritis" if cuti >= 2 else "Perlu Perhatian",
        )

    priority_order = {"Kritis": 0, "Penting": 1, "Perlu Perhatian": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["prioritas"], 99))
    return recommendations


def _build_shap_description(feature_name: str, shap_value: float, raw_value: float, asal_daerah: str = "", total_smt: int = 2) -> str:
    """Membuat deskripsi naratif untuk faktor pemicu."""
    if feature_name == "delta_ips":
        return f"IPS {'turun' if raw_value < 0 else 'naik'} {abs(raw_value):.2f} poin dari semester 1 ke 2"

    if feature_name in ("ips_smt1", "ips_smt2"):
        smt_num = "1" if feature_name == "ips_smt1" else "2"
        return f"IPS Semester {smt_num} sebesar {raw_value:.2f}"

    if feature_name == "golongan_ukt":
        ukt = int(raw_value)
        ket = "tinggi — meningkatkan risiko DO" if ukt >= 6 else ("sedang" if ukt >= 4 else "rendah — menurunkan risiko DO")
        return f"Golongan UKT {ukt} ({ket})"

    if feature_name == "status_cuti":
        jumlah_cuti = int(raw_value)
        if jumlah_cuti == 0:
            return f"Tidak pernah mengambil cuti dalam {total_smt} semester"
        return f"Mengambil cuti {jumlah_cuti} kali dalam {total_smt} semester"

    if feature_name == "kode_wilayah":
        val = int(raw_value)
        daerah = asal_daerah or "-"
        desc = "Dalam Kecamatan Buleleng, Kabupaten Buleleng" if val == 1 else (
            "Luar Kecamatan Buleleng, Kabupaten Buleleng" if val == 2 else "Luar Kecamatan & Kabupaten Buleleng"
        )
        return f"Asal wilayah: {daerah} ({desc})"

    if feature_name == "persen_kehadiran_smt2":
        ket = "sangat baik" if raw_value >= 90 else ("cukup, di atas batas minimum" if raw_value >= 75 else "di bawah 75% — terancam cekal UAS")
        return f"Tingkat kehadiran {raw_value:.1f}% ({ket})"

    if feature_name == "mk_cekal_uas_smt2":
        val = int(raw_value)
        return "Tidak ada MK yang dicekal UAS" if val == 0 else f"{val} mata kuliah dicekal UAS (kehadiran <75% → otomatis nilai E)"

    return f"{feature_name} = {raw_value}"


def _build_mhs_query(fakultas: Optional[str] = None, semester: Optional[int] = None, search: Optional[str] = None):
    """Membangun query SELECT mahasiswa dengan filter opsional."""
    conditions, params = [], {}
    if semester is not None:
        conditions.append("m.smt = :semester")
        params["semester"] = semester
    if fakultas:
        conditions.append("m.fakultas_prodi ILIKE :fakultas")
        params["fakultas"] = f"%{fakultas}%"
    if search:
        conditions.append("(m.nim ILIKE :search OR m.nama ILIKE :search)")
        params["search"] = f"%{search}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = text(f"""
        SELECT
            m.nim, m.nama, m.fakultas_prodi, m.smt,
            m.ips_smt1, m.ips_smt2, m.golongan_ukt, m.status_cuti,
            m.kode_wilayah, m.asal_daerah, m.persen_kehadiran_smt2,
            m.mk_cekal_uas_smt2
        FROM data_mahasiswa_smt2 m
        {where_clause}
        ORDER BY m.nim
    """)
    return query, params


# ============================================================
# Endpoint 1: GET /api/v1/mahasiswa
# ============================================================
@app.get("/api/v1/mahasiswa")
def get_all_mahasiswa(
    fakultas: Optional[str] = Query(None, description="Filter berdasarkan fakultas"),
    status_risiko: Optional[str] = Query(None, description="Filter berdasarkan status risiko"),
    semester: Optional[int] = Query(None, description="Filter berdasarkan semester"),
    search: Optional[str] = Query(None, description="Pencarian nama atau NIM"),
):
    """
    Mengembalikan list seluruh mahasiswa beserta skor prediksi (%)
    dan status risiko untuk tabel utama UI Siprido.
    """
    try:
        query, params = _build_mhs_query(fakultas, semester, search)
        with engine.begin() as conn:
            rows = conn.execute(query, params).mappings().all()
            if not rows:
                return {"total": 0, "data": []}

            df_all = _prepare_df([dict(r) for r in rows])
            X_all = df_all[FEATURE_COLUMNS].astype(float)
            probas_all = model.predict_proba(X_all)[:, 1]

            result, upsert_batch = [], []
            for mhs, proba in zip(df_all.to_dict(orient="records"), probas_all):
                skor, status = _calc_do_score(float(proba), mhs)
                upsert_batch.append({"nim": mhs["nim"], "skor": skor, "status": status})

                if status_risiko and status.lower() != status_risiko.lower():
                    continue

                mhs["semester"] = mhs["smt"]
                mhs["wilayah"] = WILAYAH_LABELS.get(mhs["kode_wilayah"], "-")
                mhs["skor_prediksi"] = skor
                mhs["status_risiko"] = status
                result.append(mhs)

            if upsert_batch:
                conn.execute(QUERY_UPSERT_PREDIKSI, upsert_batch)

        result.sort(key=lambda x: x["skor_prediksi"], reverse=True)
        return {"total": len(result), "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan internal server: {str(e)}")


# ============================================================
# Endpoint 2: GET /api/v1/mahasiswa/{nim}/detail
# ============================================================
@app.get("/api/v1/mahasiswa/{nim}/detail")
def get_mahasiswa_detail(nim: str):
    """
    Mengeksekusi XGBoost built-in SHAP (pred_contribs) untuk
    mahasiswa tertentu dan mengembalikan Top 3 faktor pemicu utama risiko DO.
    """
    with engine.connect() as conn:
        row = conn.execute(QUERY_MHS_DETAIL, {"nim": nim}).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {nim} tidak ditemukan.")

    mhs_data = dict(row)
    mhs_data["delta_ips"] = float(mhs_data["ips_smt2"]) - float(mhs_data["ips_smt1"])
    mhs_data["persen_kehadiran_smt2"] = float(mhs_data.get("persen_kehadiran_smt2") or 100.0)
    mhs_data["mk_cekal_uas_smt2"] = int(mhs_data.get("mk_cekal_uas_smt2") or 0)
    X = pd.DataFrame([{col: float(mhs_data[col]) for col in FEATURE_COLUMNS}])

    proba_raw = float(model.predict_proba(X)[0][1])
    skor_do, status_risiko = _calc_do_score(proba_raw, mhs_data)
    shap_values, base_value = _compute_shap_values(X)

    feature_items = []
    for i, feat in enumerate(FEATURE_COLUMNS):
        sv = float(shap_values[i])
        rv = float(X.iloc[0][feat])
        rv_rounded = round(rv, 2)
        w = _calc_feature_weight(feat, sv, rv)
        pilar = FEATURE_PILLAR.get(feat, "Lainnya")
        feature_items.append((w, {
            "feature": feat,
            "label": FEATURE_LABELS[feat],
            "shap_value": round(sv, 4),
            "raw_value": rv_rounded,
            "deskripsi": _build_shap_description(feat, sv, rv_rounded, asal_daerah=mhs_data.get("asal_daerah", ""), total_smt=mhs_data.get("smt", 2)),
            "pilar": pilar,
            "otoritas_pilar": PILLAR_AUTHORITIES.get(pilar, "-"),
        }))

    feature_items.sort(key=lambda item: item[0], reverse=True)
    total_abs = sum(w for w, _ in feature_items) or 1.0

    feature_shap = []
    for w, f in feature_items:
        pct = (w / total_abs) * 100
        f["bobot_persen"] = round(pct, 1)
        f["level_dampak"] = "Sangat Dominan" if pct >= 50 else ("Signifikan" if pct >= 25 else "Moderat")
        feature_shap.append(f)

    top_3 = [
        f | {"kontribusi": _get_kontribusi(f["feature"], f["shap_value"], f["raw_value"])}
        for f in feature_shap[:3]
    ]

    rekomendasi = _generate_recommendations(top_3, mhs_data)

    return {
        "mahasiswa": {
            "nim": mhs_data["nim"],
            "nama": mhs_data["nama"],
            "fakultas_prodi": mhs_data["fakultas_prodi"],
            "semester": mhs_data["smt"],
            "ips_smt1": mhs_data["ips_smt1"],
            "ips_smt2": mhs_data["ips_smt2"],
            "ipk": round((mhs_data["ips_smt1"] + mhs_data["ips_smt2"]) / 2.0, 2),
            "delta_ips": round(mhs_data["delta_ips"], 2),
            "golongan_ukt": mhs_data["golongan_ukt"],
            "status_cuti": mhs_data["status_cuti"],
            "kode_wilayah": mhs_data["kode_wilayah"],
            "asal_daerah": mhs_data.get("asal_daerah", "-"),
            "wilayah": WILAYAH_LABELS.get(mhs_data["kode_wilayah"], "-"),
            "persen_kehadiran_smt2": mhs_data.get("persen_kehadiran_smt2", 100.0),
            "mk_cekal_uas_smt2": mhs_data.get("mk_cekal_uas_smt2", 0),
        },
        "prediksi": {
            "skor_prediksi_model": skor_do,
            "status_risiko": status_risiko,
        },
        "shap_explanation": {
            "base_value": round(float(base_value), 4),
            "top_3_faktor": top_3,
            "semua_faktor": feature_shap,
            "rekomendasi_intervensi": rekomendasi,
        },
    }


# ============================================================
# Endpoint 3: POST /api/v1/mahasiswa/bulk-sync (Integrasi SIAKAD/IES)
# ============================================================
@app.post("/api/v1/mahasiswa/bulk-sync")
def bulk_sync_siakad_data(payload: SIAKADBulkSyncRequest):
    """
    Endpoint integrasi SIAKAD / IES eksternal untuk mengimpor atau meng-update data mahasiswa massal.
    Otomatis menghitung skor prediksi DO real-time & menyinkronkan ke tabel prediksi_do.
    """
    if not payload.data:
        return {"status": "success", "total_synced": 0, "data": []}

    mhs_dicts = [item.model_dump() for item in payload.data]
    df_sync = _prepare_df(mhs_dicts)
    X = df_sync[FEATURE_COLUMNS].astype(float)
    probas = model.predict_proba(X)[:, 1]

    synced_items = []
    for mhs, proba in zip(df_sync.to_dict(orient="records"), probas):
        skor_do, status = _calc_do_score(float(proba), mhs)
        synced_items.append({
            "nim": mhs["nim"],
            "skor": skor_do,
            "status": status,
            "skor_prediksi": skor_do,
            "status_risiko": status,
        })

    with engine.begin() as conn:
        conn.execute(QUERY_UPSERT_MHS, mhs_dicts)
        conn.execute(QUERY_UPSERT_PREDIKSI, synced_items)

    return {
        "status": "success",
        "total_synced": len(synced_items),
        "data": synced_items,
    }


# ============================================================
# Endpoint 4: POST /api/v1/admin/retrain (MLOps Retraining)
# ============================================================
@app.post("/api/v1/admin/retrain")
def retrain_model_endpoint():
    """
    Endpoint MLOps untuk melatih ulang model XGBoost secara langsung
    dan memperbarui cache model di memori API tanpa restart server.
    """
    global model
    try:
        new_model, importance = train_and_save_model()
        model = new_model
        return {
            "status": "success",
            "message": "Model XGBoost berhasil dilatih ulang & di-hot reload di memory API.",
            "feature_importances": importance,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")


# ============================================================
# Endpoint 5: GET /api/v1/analytics/macro-insights
# ============================================================
@app.get("/api/v1/analytics/macro-insights")
def get_macro_insights(
    fakultas: Optional[str] = Query(None, description="Filter berdasarkan fakultas"),
    semester: Optional[int] = Query(None, description="Filter berdasarkan semester"),
):
    """
    Agregasi faktor risiko dominan di tingkat makro universitas/fakultas.
    Menghitung rata-rata kontribusi relatif per pilar dan per fitur
    berdasarkan seluruh mahasiswa (dengan penekanan pada yang berisiko).
    """
    try:
        query, params = _build_mhs_query(fakultas, semester)
        with engine.connect() as conn:
            rows = conn.execute(query, params).mappings().all()

        if not rows:
            return {
                "filter": {"fakultas": fakultas, "semester": semester},
                "total_mahasiswa": 0,
                "total_berisiko": 0,
                "distribusi_pilar_pemicu": {},
                "top_3_faktor_global": [],
            }

        df_all = _prepare_df([dict(r) for r in rows])
        X_all = df_all[FEATURE_COLUMNS].astype(float)
        probas_all = model.predict_proba(X_all)[:, 1]

        mhs_records = df_all.to_dict(orient="records")
        total_berisiko = sum(
            1 for mhs, proba in zip(mhs_records, probas_all)
            if _calc_do_score(float(proba), mhs)[0] >= 40
        )

        total_mahasiswa = len(df_all)
        booster = model.get_booster()
        dmatrix = xgb.DMatrix(X_all, feature_names=FEATURE_COLUMNS)
        contribs = booster.predict(dmatrix, pred_contribs=True)

        feature_pct_accum = {feat: 0.0 for feat in FEATURE_COLUMNS}
        X_numpy = X_all.to_numpy()
        for row_idx in range(total_mahasiswa):
            shap_vals = contribs[row_idx, :-1]
            raw_vals = X_numpy[row_idx]
            weights = [
                _calc_feature_weight(feat, float(shap_vals[i]), float(raw_vals[i]))
                for i, feat in enumerate(FEATURE_COLUMNS)
            ]
            total_w = sum(weights) or 1.0
            for feat, w in zip(FEATURE_COLUMNS, weights):
                feature_pct_accum[feat] += (w / total_w) * 100

        pilar_pct_accum = {
            pilar: sum(feature_pct_accum[feat] for feat, p in FEATURE_PILLAR.items() if p == pilar)
            for pilar in PILLAR_AUTHORITIES
        }
        distribusi_pilar = {
            pilar: {
                "jumlah": round((total_pct / total_mahasiswa) / 100 * total_mahasiswa),
                "persen": round(total_pct / total_mahasiswa, 1),
            }
            for pilar, total_pct in pilar_pct_accum.items()
        }

        sorted_features = sorted(
            ((feat, total_pct / total_mahasiswa) for feat, total_pct in feature_pct_accum.items()),
            key=lambda x: x[1],
            reverse=True,
        )[:3]

        top_3_global = [
            {
                "feature": feat,
                "label": FEATURE_LABELS[feat],
                "pilar": FEATURE_PILLAR.get(feat, "Lainnya"),
                "jumlah_terdampak": round(avg_pct / 100 * total_mahasiswa),
                "persen": round(avg_pct, 1),
            }
            for feat, avg_pct in sorted_features
        ]

        return {
            "filter": {"fakultas": fakultas, "semester": semester},
            "total_mahasiswa": total_mahasiswa,
            "total_berisiko": total_berisiko,
            "distribusi_pilar_pemicu": distribusi_pilar,
            "top_3_faktor_global": top_3_global,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan: {str(e)}")


# ============================================================
# Endpoint 6 & 7: Intervensi Bimbingan Akademik DPA
# ============================================================
@app.get("/api/v1/mahasiswa/{nim}/intervensi")
def get_intervensi_history(nim: str):
    """Mengambil riwayat catatan intervensi/bimbingan akademik untuk mahasiswa tertentu."""
    with engine.connect() as conn:
        rows = conn.execute(QUERY_GET_INTERVENSI, {"nim": nim}).mappings().all()

    return {
        "nim": nim,
        "total": len(rows),
        "data": [dict(r) for r in rows],
    }


@app.post("/api/v1/mahasiswa/{nim}/intervensi")
def create_intervensi_record(nim: str, payload: IntervensiCreateRequest):
    """Menambahkan catatan tindakan intervensi/bimbingan akademik baru oleh DPA/Kaprodi."""
    with engine.begin() as conn:
        exists = conn.execute(QUERY_CHECK_MHS_EXISTS, {"nim": nim}).first()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {nim} tidak ditemukan.")

        row = conn.execute(QUERY_INSERT_INTERVENSI, {
            "nim": nim,
            "jenis_tindakan": payload.jenis_tindakan,
            "catatan": payload.catatan,
            "petugas": payload.petugas,
        }).mappings().first()

    return {
        "status": "success",
        "message": "Catatan intervensi berhasil disimpan.",
        "data": dict(row),
    }
