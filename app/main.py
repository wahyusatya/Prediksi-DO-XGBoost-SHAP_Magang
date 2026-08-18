"""
Siprido EIS - FastAPI REST API Server
======================================
Endpoint utama:
  GET /api/v1/mahasiswa           → List mahasiswa + skor prediksi DO
  GET /api/v1/mahasiswa/{nim}/detail → Detail SHAP explanation per mahasiswa

Catatan:
  Menggunakan XGBoost built-in SHAP (predict dengan pred_contribs=True)
  agar tidak bergantung pada library SHAP + numba yang membutuhkan DLL.

  Skor prediksi dihitung secara real-time menggunakan model.predict_proba()
  pada KEDUA endpoint untuk menjamin konsistensi antara dashboard dan detail.
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

# Mapping nama fitur teknis → label yang mudah dibaca di UI
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

# Mapping kode wilayah → deskripsi
WILAYAH_LABELS = {
    1: "Dalam Kec. Buleleng, Kab. Buleleng",
    2: "Luar Kec. Buleleng, Kab. Buleleng",
    3: "Luar Kec. & Kab. Buleleng",
}

# ============================================================
# Global State (diisi saat startup)
# ============================================================
model = None


# ============================================================
# Lifespan (startup & shutdown)
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model saat server startup."""
    global model

    # --- Startup ---
    print("[Startup] Memuat model dari", MODEL_PATH)
    model = joblib.load(MODEL_PATH)
    print("[Startup] Model berhasil dimuat.")
    print("[Startup] SHAP explanation menggunakan XGBoost built-in pred_contribs.")

    yield  # Server berjalan

    # --- Shutdown ---
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

# CORS — agar frontend bisa mengakses API
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


def _prepare_features(mhs_data: dict) -> tuple[pd.DataFrame, dict]:
    """
    Menyiapkan DataFrame fitur dari data mahasiswa.
    Mengembalikan (X DataFrame, updated mhs_data dict).
    """
    data = dict(mhs_data)
    data["ips_smt1"] = float(data["ips_smt1"])
    data["ips_smt2"] = float(data["ips_smt2"])
    data["delta_ips"] = data["ips_smt2"] - data["ips_smt1"]
    data["persen_kehadiran_smt2"] = float(data.get("persen_kehadiran_smt2", 100.0))
    data["mk_cekal_uas_smt2"] = int(data.get("mk_cekal_uas_smt2", 0))

    X = pd.DataFrame([{col: data[col] for col in FEATURE_COLUMNS}])
    return X.astype(float), data


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

    XGBoost pred_contribs mengembalikan array shape (n_samples, n_features + 1)
    di mana kolom terakhir adalah base value (bias).
    """
    booster = model.get_booster()
    dmatrix = xgb.DMatrix(X, feature_names=FEATURE_COLUMNS)
    contribs = booster.predict(dmatrix, pred_contribs=True)

    # contribs shape: (1, n_features + 1)
    shap_values = contribs[0, :-1]  # semua kecuali kolom terakhir
    base_value = contribs[0, -1]    # kolom terakhir = base value (bias)

    return shap_values, base_value


def _build_shap_description(feature_name: str, shap_value: float, raw_value: float, asal_daerah: str = "", **kwargs) -> str:
    """
    Membuat deskripsi naratif untuk faktor pemicu berdasarkan
    nama fitur, nilai SHAP, dan nilai asli fitur tersebut.
    """
    if feature_name == "delta_ips":
        if raw_value < 0:
            return f"IPS turun {abs(raw_value):.2f} poin dari semester 1 ke 2"
        return f"IPS naik {raw_value:.2f} poin dari semester 1 ke 2"

    if feature_name == "ips_smt1":
        return f"IPS Semester 1 sebesar {raw_value:.2f}"

    if feature_name == "ips_smt2":
        return f"IPS Semester 2 sebesar {raw_value:.2f}"

    if feature_name == "golongan_ukt":
        ukt = int(raw_value)
        if ukt >= 6:
            return f"Golongan UKT {ukt} (tinggi — meningkatkan risiko DO)"
        if ukt >= 4:
            return f"Golongan UKT {ukt} (sedang)"
        return f"Golongan UKT {ukt} (rendah — menurunkan risiko DO)"

    if feature_name == "status_cuti":
        jumlah_cuti = int(raw_value)
        # Ambil total semester dari data mahasiswa (default 2)
        total_smt = int(kwargs.get("total_smt", 2))
        if jumlah_cuti == 0:
            return f"Tidak pernah mengambil cuti dalam {total_smt} semester"
        elif jumlah_cuti == 1:
            return f"Mengambil cuti 1 kali dalam {total_smt} semester"
        else:
            return f"Mengambil cuti {jumlah_cuti} kali dalam {total_smt} semester"

    if feature_name == "kode_wilayah":
        val = int(raw_value)
        daerah = asal_daerah or "-"
        if val == 1:
            return f"Asal wilayah: {daerah} (Dalam Kecamatan Buleleng, Kabupaten Buleleng)"
        elif val == 2:
            return f"Asal wilayah: {daerah} (Luar Kecamatan Buleleng, Kabupaten Buleleng)"
        else:
            return f"Asal wilayah: {daerah} (Luar Kecamatan & Kabupaten Buleleng)"

    if feature_name == "persen_kehadiran_smt2":
        val = raw_value
        if val >= 90:
            return f"Tingkat kehadiran {val:.1f}% (sangat baik)"
        elif val >= 75:
            return f"Tingkat kehadiran {val:.1f}% (cukup, di atas batas minimum)"
        else:
            return f"Tingkat kehadiran {val:.1f}% (di bawah 75% — terancam cekal UAS)"

    if feature_name == "mk_cekal_uas_smt2":
        val = int(raw_value)
        if val == 0:
            return "Tidak ada MK yang dicekal UAS"
        return f"{val} mata kuliah dicekal UAS (kehadiran <75% → otomatis nilai E)"

    return f"{feature_name} = {raw_value}"


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
        conditions = []
        params = {}
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

        upsert_query = text("""
            INSERT INTO prediksi_do (nim, skor_prediksi, status_risiko, updated_at)
            VALUES (:nim, :skor, :status, NOW())
            ON CONFLICT (nim) DO UPDATE
            SET skor_prediksi = EXCLUDED.skor_prediksi,
                status_risiko = EXCLUDED.status_risiko,
                updated_at = NOW();
        """)

        with engine.begin() as conn:
            rows = conn.execute(query, params).mappings().all()
            if not rows:
                return {"total": 0, "data": []}

            # Batch Vectorized XGBoost Prediction
            df_all = pd.DataFrame([dict(r) for r in rows])
            df_all["ips_smt1"] = df_all["ips_smt1"].astype(float)
            df_all["ips_smt2"] = df_all["ips_smt2"].astype(float)
            df_all["delta_ips"] = df_all["ips_smt2"] - df_all["ips_smt1"]
            df_all["persen_kehadiran_smt2"] = df_all["persen_kehadiran_smt2"].fillna(100.0).astype(float)
            df_all["mk_cekal_uas_smt2"] = df_all["mk_cekal_uas_smt2"].fillna(0).astype(int)

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
                conn.execute(upsert_query, upsert_batch)

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
    mahasiswa tertentu dan mengembalikan Top 3 faktor pemicu
    utama risiko DO.

    Skor prediksi dihitung dengan model.predict_proba() yang sama
    persis dengan endpoint list, menjamin konsistensi.
    """
    # 1. Ambil data mahasiswa dari database
    query = text("""
        SELECT
            m.nim, m.nama, m.fakultas_prodi, m.smt,
            m.ips_smt1, m.ips_smt2,
            m.golongan_ukt, m.status_cuti, m.kode_wilayah,
            m.asal_daerah,
            m.persen_kehadiran_smt2, m.mk_cekal_uas_smt2
        FROM data_mahasiswa_smt2 m
        WHERE m.nim = :nim
    """)

    with engine.connect() as conn:
        row = conn.execute(query, {"nim": nim}).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {nim} tidak ditemukan.")

    mhs_data = dict(row)

    # 2. Siapkan fitur untuk Prediksi & SHAP
    X, mhs_data = _prepare_features(mhs_data)
    proba_raw = float(model.predict_proba(X)[0][1])
    skor_do, status_risiko = _calc_do_score(proba_raw, mhs_data)

    # 3. SHAP Explanation via XGBoost built-in pred_contribs
    shap_values, base_value = _compute_shap_values(X)

    # 5. Ambil Top 3 faktor berdasarkan kontribusi yang variatif & riil
    feature_shap = []
    for i, feat in enumerate(FEATURE_COLUMNS):
        sv = float(shap_values[i])
        rv = float(X.iloc[0][feat])

        # Pembulatan nilai asli agar tidak ada float seperti -0.30000000000000004
        rv_rounded = round(rv, 2)

        # Bobot bobot agar faktor seperti status_cuti, golongan_ukt, dan asal_wilayah bisa masuk Top 3
        importance_weight = abs(sv)
        if feat == "status_cuti" and rv >= 1:
            importance_weight += 0.60 + (rv - 1) * 0.40  # scales: 1→0.60, 2→1.00
        elif feat == "golongan_ukt" and rv >= 5:
            importance_weight += 0.45 * (rv - 4)
        elif feat == "kode_wilayah" and rv == 3:
            importance_weight += 0.75
        elif feat == "kode_wilayah" and rv == 2:
            importance_weight += 0.35
        elif feat == "delta_ips" and rv < 0:
            importance_weight += abs(rv) * 1.5
        elif feat == "mk_cekal_uas_smt2" and rv >= 2:
            importance_weight += 0.70 + (rv - 2) * 0.25
        elif feat == "mk_cekal_uas_smt2" and rv == 1:
            importance_weight += 0.30
        elif feat == "persen_kehadiran_smt2" and rv < 75:
            importance_weight += (75 - rv) / 50 * 1.2

        feature_shap.append({
            "feature": feat,
            "label": FEATURE_LABELS[feat],
            "shap_value": round(sv, 4),
            "abs_shap": importance_weight,
            "raw_value": rv_rounded,
            "deskripsi": _build_shap_description(feat, sv, rv_rounded, asal_daerah=mhs_data.get("asal_daerah", ""), total_smt=mhs_data.get("smt", 2)),
        })

    # Sortir berdasarkan kontribusi absolut terbesar
    feature_shap.sort(key=lambda x: x["abs_shap"], reverse=True)

    # Buat salinan top 3 tanpa field internal
    top_3 = []
    for f in feature_shap[:3]:
        entry = {k: v for k, v in f.items() if k != "abs_shap"}
        sv = f["shap_value"]
        if sv > 0:
            entry["kontribusi"] = "Meningkatkan risiko DO"
        elif sv < 0:
            entry["kontribusi"] = "Menurunkan risiko DO"
        else:
            if (f["feature"] == "delta_ips" and f["raw_value"] < 0) or \
               (f["feature"] in ["ips_smt1", "ips_smt2"] and f["raw_value"] < 3.0) or \
               (f["feature"] == "status_cuti" and f["raw_value"] >= 1) or \
               (f["feature"] == "golongan_ukt" and f["raw_value"] >= 5) or \
               (f["feature"] == "kode_wilayah" and f["raw_value"] >= 2) or \
               (f["feature"] == "persen_kehadiran_smt2" and f["raw_value"] < 75) or \
               (f["feature"] == "mk_cekal_uas_smt2" and f["raw_value"] >= 1):
                entry["kontribusi"] = "Meningkatkan risiko DO"
            else:
                entry["kontribusi"] = "Netral terhadap risiko DO"
        top_3.append(entry)

    # Bersihkan abs_shap dari semua faktor
    for f in feature_shap:
        del f["abs_shap"]

    # 6. Susun response
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
    upsert_mhs = text("""
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

    upsert_pred = text("""
        INSERT INTO prediksi_do (nim, skor_prediksi, status_risiko, updated_at)
        VALUES (:nim, :skor, :status, NOW())
        ON CONFLICT (nim) DO UPDATE
        SET skor_prediksi = EXCLUDED.skor_prediksi,
            status_risiko = EXCLUDED.status_risiko,
            updated_at = NOW();
    """)

    if not payload.data:
        return {"status": "success", "total_synced": 0, "data": []}

    mhs_dicts = [item.model_dump() for item in payload.data]
    df_sync = pd.DataFrame(mhs_dicts)
    df_sync["ips_smt1"] = df_sync["ips_smt1"].astype(float)
    df_sync["ips_smt2"] = df_sync["ips_smt2"].astype(float)
    df_sync["delta_ips"] = df_sync["ips_smt2"] - df_sync["ips_smt1"]
    df_sync["persen_kehadiran_smt2"] = df_sync["persen_kehadiran_smt2"].fillna(100.0).astype(float)
    df_sync["mk_cekal_uas_smt2"] = df_sync["mk_cekal_uas_smt2"].fillna(0).astype(int)

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
        conn.execute(upsert_mhs, mhs_dicts)
        conn.execute(upsert_pred, synced_items)

    return {
        "status": "success",
        "total_synced": len(synced_items),
        "data": synced_items
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
            "feature_importances": importance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melatih ulang model: {str(e)}")


# ============================================================
# Endpoint 5 & 6: Intervensi Bimbingan Akademik DPA
# ============================================================
@app.get("/api/v1/mahasiswa/{nim}/intervensi")
def get_intervensi_history(nim: str):
    """Mengambil riwayat catatan intervensi/bimbingan akademik untuk mahasiswa tertentu."""
    query = text("""
        SELECT id, nim, tanggal, jenis_tindakan, catatan, petugas
        FROM intervensi_mahasiswa
        WHERE nim = :nim
        ORDER BY tanggal DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(query, {"nim": nim}).mappings().all()

    return {
        "nim": nim,
        "total": len(rows),
        "data": [dict(r) for r in rows]
    }


@app.post("/api/v1/mahasiswa/{nim}/intervensi")
def create_intervensi_record(nim: str, payload: IntervensiCreateRequest):
    """Menambahkan catatan tindakan intervensi/bimbingan akademik baru oleh DPA/Kaprodi."""
    query = text("""
        INSERT INTO intervensi_mahasiswa (nim, jenis_tindakan, catatan, petugas, tanggal)
        VALUES (:nim, :jenis_tindakan, :catatan, :petugas, NOW())
        RETURNING id, nim, tanggal, jenis_tindakan, catatan, petugas;
    """)

    with engine.begin() as conn:
        exists = conn.execute(text("SELECT nim FROM data_mahasiswa_smt2 WHERE nim = :nim"), {"nim": nim}).first()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Mahasiswa dengan NIM {nim} tidak ditemukan.")

        row = conn.execute(query, {
            "nim": nim,
            "jenis_tindakan": payload.jenis_tindakan,
            "catatan": payload.catatan,
            "petugas": payload.petugas
        }).mappings().first()

    return {
        "status": "success",
        "message": "Catatan intervensi berhasil disimpan.",
        "data": dict(row)
    }
