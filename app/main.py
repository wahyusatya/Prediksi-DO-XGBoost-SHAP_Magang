"""
Siprido EIS - FastAPI REST API Server (Fokus Semester 2 & 6 Fitur Riil)
======================================================================
Endpoint utama:
  GET  /api/v1/mahasiswa                  → List mahasiswa (NIM) + skor prediksi DO
  GET  /api/v1/mahasiswa/{nim}/detail     → Detail SHAP explanation 6 fitur riil
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
import re
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

try:
    from database import engine
    from train_model import train_and_save_model
    from etl_excel_data import parse_riwayat_ips, map_kode_wilayah, format_asal_daerah, map_fakultas_prodi, UKT_MAP
except ImportError:
    from app.database import engine
    from app.train_model import train_and_save_model
    from app.etl_excel_data import parse_riwayat_ips, map_kode_wilayah, format_asal_daerah, map_fakultas_prodi, UKT_MAP


# ============================================================
# Pydantic Schemas (Request Models)
# ============================================================
class MahasiswaSyncItem(BaseModel):
    nim: str
    fakultas_prodi: Optional[str] = None
    smt: int = 2
    ips_smt1: Optional[float] = None
    ips_smt2: Optional[float] = None
    golongan_ukt: int = 1
    status_cuti: int = 0
    kode_wilayah: int = 1
    asal_daerah: Optional[str] = "-"

    @model_validator(mode="before")
    @classmethod
    def handle_raw_and_flexible_inputs(cls, data):
        if not isinstance(data, dict):
            return data
        d = dict(data)

        # 1. Parsing IPS Semester 1 & 2 dari riwayat_ips jika belum terpisah
        riw = d.get("riwayat_ips")
        if riw and (d.get("ips_smt1") is None or d.get("ips_smt2") is None):
            v1, v2 = parse_riwayat_ips(riw)
            if v1 is not None and d.get("ips_smt1") is None:
                d["ips_smt1"] = v1
            if v2 is not None and d.get("ips_smt2") is None:
                d["ips_smt2"] = v2

        if d.get("ips_smt1") is None:
            d["ips_smt1"] = float(d.get("IPS_terakhir", 0.0) or 0.0)
        if d.get("ips_smt2") is None:
            d["ips_smt2"] = float(d.get("IPS_terakhir", 0.0) or 0.0)

        # 2. Pemetaan Fakultas / Prodi dari raw fakultas & jurusan
        if not d.get("fakultas_prodi"):
            d["fakultas_prodi"] = map_fakultas_prodi(d.get("fakultas", ""), d.get("jurusan", ""))

        # 3. Pemetaan UKT
        raw_ukt = d.get("tingkat UKT") or d.get("tingkat_ukt")
        if raw_ukt:
            d["golongan_ukt"] = UKT_MAP.get(str(raw_ukt).strip(), d.get("golongan_ukt", 1))

        # 4. Pemetaan Cuti
        if "jumlah_cuti" in d:
            d["status_cuti"] = int(d.get("jumlah_cuti") or 0)

        # 5. Pemetaan Wilayah
        dom = d.get("wilayah domisili") or d.get("wilayah_domisili")
        if dom:
            d["kode_wilayah"] = map_kode_wilayah(dom)
            d["asal_daerah"] = format_asal_daerah(dom)

        return d


class SIAKADBulkSyncRequest(BaseModel):
    data: List[MahasiswaSyncItem]


class IntervensiCreateRequest(BaseModel):
    jenis_tindakan: str = Field(..., example="Bimbingan Akademik DPA")
    catatan: str = Field(..., example="Mahasiswa diberikan konseling akademik dan evaluasi kendala studi.")
    petugas: str = Field(default="DPA / Akademik", example="Dr. Wayan (DPA)")


# ============================================================
# Konstanta & Konfigurasi Fitur Riil
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
]

FEATURE_LABELS = {
    "ips_smt1": "IPS Semester 1",
    "ips_smt2": "IPS Semester 2",
    "delta_ips": "Perubahan IPS (Semester 1 ke 2)",
    "golongan_ukt": "Golongan UKT",
    "status_cuti": "Riwayat Cuti Akademik",
    "kode_wilayah": "Asal Wilayah Domisili",
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
    "golongan_ukt": "Finansial & Wilayah",
    "kode_wilayah": "Finansial & Wilayah",
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
        (nim, fakultas_prodi, smt, ips_smt1, ips_smt2, golongan_ukt, status_cuti, kode_wilayah, asal_daerah)
    VALUES
        (:nim, :fakultas_prodi, :smt, :ips_smt1, :ips_smt2, :golongan_ukt, :status_cuti, :kode_wilayah, :asal_daerah)
    ON CONFLICT (nim) DO UPDATE
    SET fakultas_prodi = EXCLUDED.fakultas_prodi,
        smt = EXCLUDED.smt,
        ips_smt1 = EXCLUDED.ips_smt1,
        ips_smt2 = EXCLUDED.ips_smt2,
        golongan_ukt = EXCLUDED.golongan_ukt,
        status_cuti = EXCLUDED.status_cuti,
        kode_wilayah = EXCLUDED.kode_wilayah,
        asal_daerah = EXCLUDED.asal_daerah;
""")

QUERY_MHS_DETAIL = text("""
    SELECT
        m.nim, m.fakultas_prodi, m.smt,
        m.ips_smt1, m.ips_smt2,
        m.golongan_ukt, m.status_cuti, m.kode_wilayah,
        m.asal_daerah
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
    description="REST API untuk Sistem Informasi Eksekutif Prediksi Drop Out Mahasiswa (Fokus Semester 2)",
    version="2.0.0",
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
    df["golongan_ukt"] = df["golongan_ukt"].astype(int)
    df["status_cuti"] = df["status_cuti"].astype(int)
    df["kode_wilayah"] = df["kode_wilayah"].astype(int)
    return df


def _calc_do_score(proba_raw: float, data: dict) -> tuple[int, str]:
    """
    Menghitung skor prediksi DO secara konsisten untuk dashboard & detail
    berbasis performa akademik utama dengan gradien UKT yang proporsional.
    """
    ips1 = float(data.get("ips_smt1", 0.0))
    ips2 = float(data.get("ips_smt2", 0.0))
    delta = float(data.get("delta_ips", ips2 - ips1))
    cuti = int(data.get("status_cuti", 0))
    ukt = int(data.get("golongan_ukt", 1))
    wilayah = int(data.get("kode_wilayah", 1))

    # ponytail: gradien UKT moderat (memberi bobot wajar ~13-14% pada UKT 7 tanpa melompat ke risiko sedang)
    if ips1 < 2.75 or ips2 < 2.50 or cuti >= 1:
        base = 68.0 + max(0.0, (2.75 - min(ips1, ips2))) * 12.0 + cuti * 6.0 + (ukt - 1) * 0.5 + (wilayah - 1) * 0.5
        final_float = min(98.0, max(70.0, 0.40 * (proba_raw * 100) + 0.60 * base))
    elif delta < -0.40 or ips2 < 2.85:
        base = 40.0 + (abs(delta) * 15.0 if delta < 0 else 0.0) + max(0.0, (2.85 - ips2)) * 12.0 + (ukt - 1) * 0.8
        final_float = min(69.0, max(40.0, 0.40 * (proba_raw * 100) + 0.60 * base))
    else:
        base = 18.0 - (ips1 - 3.00) * 8.0 - (ips2 - 3.00) * 8.0 + (ukt - 1) * 1.2 + (wilayah - 1) * 0.8
        final_float = min(35.0, max(5.0, 0.40 * (proba_raw * 100) + 0.60 * base))

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
    """Menghitung weighted importance SHAP murni tanpa inflasi artifisial."""
    return abs(sv)


def _get_kontribusi(feat: str, sv: float, rv: float) -> str:
    """Menentukan narasi arah kontribusi faktor terhadap risiko DO berdasarkan SHAP."""
    if sv > 0.05:
        return "Meningkatkan risiko DO"
    if sv < -0.05:
        return "Menurunkan risiko DO"
    return "Netral terhadap risiko DO"


def _generate_recommendations(top_factors: list, mhs_data: dict) -> list:
    """
    Mesin Rekomendasi Preskriptif berbasis rule-based heuristics untuk 6 fitur riil.
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

    ukt = int(mhs_data.get("golongan_ukt", 1))
    wilayah = int(mhs_data.get("kode_wilayah", 1))
    ips1 = float(mhs_data.get("ips_smt1", 0))
    ips2 = float(mhs_data.get("ips_smt2", 0))
    delta = ips2 - ips1
    cuti = int(mhs_data.get("status_cuti", 0))

    top_features = {f["feature"] for f in top_factors}

    # Rule 1: Cuti Akademik (Kedisiplinan)
    if "status_cuti" in top_features and cuti >= 1:
        add_rec(
            "Kedisiplinan & Keaktifan",
            "Agendakan audiensi khusus DPA untuk evaluasi status kelanjutan studi. "
            "Eksplorasi penyebab cuti akademik dan rancang rencana perbaikan studi.",
            "Kritis" if cuti >= 2 else "Penting",
        )

    # Rule 2: Finansial & Wilayah (hanya jika ada penurunan akademik / cuti)
    if ("golongan_ukt" in top_features or "kode_wilayah" in top_features) and (ukt >= 5 or wilayah >= 2):
        if ips2 < 2.75 or delta < -0.20 or cuti >= 1:
            add_rec(
                "Finansial & Wilayah",
                "Verifikasi kelayakan bantuan beasiswa atau pengajuan keringanan / penyesuaian UKT oleh BAAK/WR II. "
                "Evaluasi kondisi sosial-ekonomi keluarga serta akomodasi mahasiswa luar daerah.",
                "Kritis" if ukt >= 6 and wilayah >= 3 else "Penting",
            )

    # Rule 3: Penurunan IPS / IPS Rendah (Akademik)
    if ("delta_ips" in top_features and delta < 0) or \
       ("ips_smt1" in top_features and ips1 < 2.75) or \
       ("ips_smt2" in top_features and ips2 < 2.75):
        add_rec(
            "Akademik",
            "Rekomendasikan program pendampingan tutorial sebaya (peer-tutoring) atau remedial terarah di tingkat prodi. "
            "Libatkan Kaprodi dan DPA untuk menyusun rencana pemulihan performa akademik.",
            "Kritis" if ips2 < 2.0 or delta < -0.5 else "Penting",
        )

    priority_order = {"Kritis": 0, "Penting": 1, "Perlu Perhatian": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["prioritas"], 99))
    return recommendations


def _build_shap_description(feature_name: str, shap_value: float, raw_value: float, asal_daerah: str = "", total_smt: int = 2) -> str:
    """Membuat deskripsi naratif untuk faktor pemicu 6 fitur riil."""
    if feature_name == "delta_ips":
        return f"IPS {'turun' if raw_value < 0 else 'naik'} {abs(raw_value):.2f} poin dari semester 1 ke 2"

    if feature_name in ("ips_smt1", "ips_smt2"):
        smt_num = "1" if feature_name == "ips_smt1" else "2"
        return f"IPS Semester {smt_num} sebesar {raw_value:.2f}"

    if feature_name == "golongan_ukt":
        ukt = int(raw_value)
        ket = "UKT Kelompok Atas" if ukt >= 6 else ("UKT Kelompok Menengah" if ukt >= 4 else "UKT Kelompok Terjangkau")
        return f"Golongan UKT {ukt} ({ket})"

    if feature_name == "status_cuti":
        jumlah_cuti = int(raw_value)
        if jumlah_cuti == 0:
            return f"Tidak pernah mengambil cuti studi"
        return f"Mengambil cuti {jumlah_cuti} semester"

    if feature_name == "kode_wilayah":
        val = int(raw_value)
        daerah = asal_daerah or "-"
        desc = "Dalam Kecamatan Buleleng, Kabupaten Buleleng" if val == 1 else (
            "Luar Kecamatan Buleleng, Kabupaten Buleleng" if val == 2 else "Luar Kecamatan & Kabupaten Buleleng"
        )
        return f"Asal wilayah: {daerah} ({desc})"

    return f"{feature_name} = {raw_value}"


def _build_mhs_query(fakultas: Optional[str] = None, semester: Optional[int] = None, search: Optional[str] = None):
    """Membangun query SELECT mahasiswa dengan filter opsional."""
    if hasattr(fakultas, "default"): fakultas = None
    if hasattr(semester, "default"): semester = None
    if hasattr(search, "default"): search = None

    conditions, params = [], {}
    if semester is not None and str(semester).isdigit():
        conditions.append("m.smt = :semester")
        params["semester"] = int(semester)
    if fakultas and isinstance(fakultas, str):
        conditions.append("m.fakultas_prodi ILIKE :fakultas")
        params["fakultas"] = f"%{fakultas}%"
    if search and isinstance(search, str):
        conditions.append("(m.nim ILIKE :search OR m.fakultas_prodi ILIKE :search)")
        params["search"] = f"%{search}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = text(f"""
        SELECT
            m.nim, m.fakultas_prodi, m.smt,
            m.ips_smt1, m.ips_smt2, m.golongan_ukt, m.status_cuti,
            m.kode_wilayah, m.asal_daerah
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
    search: Optional[str] = Query(None, description="Pencarian NIM atau Prodi"),
):
    """
    Mengembalikan list seluruh mahasiswa (NIM) beserta skor prediksi (%)
    dan status risiko untuk tabel utama UI Siprido EIS.
    """
    if hasattr(fakultas, "default"): fakultas = None
    if hasattr(status_risiko, "default"): status_risiko = None
    if hasattr(semester, "default"): semester = None
    if hasattr(search, "default"): search = None

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
    try:
        with engine.connect() as conn:
            row = conn.execute(QUERY_MHS_DETAIL, {"nim": nim}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {nim} tidak ditemukan.")

        mhs_data = dict(row)
        mhs_data["delta_ips"] = float(mhs_data["ips_smt2"]) - float(mhs_data["ips_smt1"])
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
                "fakultas_prodi": mhs_data["fakultas_prodi"],
                "semester": mhs_data["smt"],
                "ips_smt1": float(mhs_data["ips_smt1"]),
                "ips_smt2": float(mhs_data["ips_smt2"]),
                "ipk": round((float(mhs_data["ips_smt1"]) + float(mhs_data["ips_smt2"])) / 2.0, 2),
                "delta_ips": round(float(mhs_data["delta_ips"]), 2),
                "golongan_ukt": int(mhs_data["golongan_ukt"]),
                "status_cuti": int(mhs_data["status_cuti"]),
                "kode_wilayah": int(mhs_data["kode_wilayah"]),
                "asal_daerah": mhs_data.get("asal_daerah", "-"),
                "wilayah": WILAYAH_LABELS.get(int(mhs_data["kode_wilayah"]), "-"),
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
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan internal server: {str(e)}")


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
    if hasattr(fakultas, "default"): fakultas = None
    if hasattr(semester, "default"): semester = None

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
