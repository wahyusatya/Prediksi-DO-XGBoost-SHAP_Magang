"""
Siprido EIS - Script Training Model XGBoost
=============================================
Script ini:
1. Mengambil data mahasiswa dari database PostgreSQL (Docker).
2. Membuat fitur turunan `delta_ips`.
3. Membuat target label dummy berbasis kondisi risiko DO.
4. Melatih model XGBClassifier dengan 8 fitur:
   ips_smt1, ips_smt2, delta_ips, golongan_ukt, status_cuti,
   kode_wilayah, persen_kehadiran_smt2, mk_cekal_uas_smt2.
5. Menyimpan model ke file `model_xgboost.joblib`.
"""

import os
import sys

import joblib
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from xgboost import XGBClassifier

# ============================================================
# 1. Konfigurasi Koneksi Database
# ============================================================
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpassword")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_NAME = os.getenv("DB_NAME", "db_siprido_eis")

DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Path output model (disimpan di direktori yang sama dengan script ini)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "model_xgboost.joblib")

# Fitur yang digunakan untuk training (8 fitur)
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


# ============================================================
# 2. Ambil Data dari Database
# ============================================================
def fetch_data() -> pd.DataFrame:
    """Mengambil data mahasiswa semester 2 dari PostgreSQL atau menggunakan synthetic dataset jika DB offline."""
    print("[1/5] Menghubungkan ke database...")
    db_available = False
    try:
        import socket
        sock = socket.create_connection(("localhost", 5433), timeout=0.5)
        sock.close()
        db_available = True
    except Exception:
        db_available = False

    if db_available:
        try:
            engine = create_engine(DATABASE_URL)
            query = "SELECT * FROM data_mahasiswa_smt2;"
            df = pd.read_sql(query, engine)
            engine.dispose()
            print(f"      Berhasil memuat {len(df)} baris data dari tabel data_mahasiswa_smt2.")
            return df
        except Exception as e:
            print(f"      [Warning] Query DB gagal ({e}). Falling back to synthetic dataset...")

    print("      [Info] Database offline/tidak terjangkau. Menggunakan dataset sintetis untuk training model...")
    np.random.seed(42)
    n_samples = 300

    ips_smt1 = np.round(np.random.uniform(1.0, 4.0, n_samples), 2)
    # status_cuti: jumlah semester cuti (0, 1, atau 2)
    status_cuti = np.random.choice([0, 1, 2], p=[0.80, 0.12, 0.08], size=n_samples)

    # Generate kehadiran yang berkorelasi logis dengan IPS & cuti
    # IPS tinggi → kehadiran tinggi; Cuti → kehadiran rendah
    base_kehadiran = np.clip(ips_smt1 / 4.0 * 80 + np.random.uniform(0, 20, n_samples), 25, 100)
    cuti_mask = status_cuti > 0
    base_kehadiran[cuti_mask] *= np.random.uniform(0.3, 0.6, cuti_mask.sum())
    base_kehadiran = np.clip(np.round(base_kehadiran, 2), 0, 100)

    # MK cekal: jika kehadiran < 75% ada peluang cekal, makin rendah makin banyak
    mk_cekal = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        if base_kehadiran[i] < 75:
            max_cekal = min(7, int((75 - base_kehadiran[i]) / 8) + 1)
            mk_cekal[i] = np.random.randint(1, max_cekal + 1)

    df = pd.DataFrame({
        "nim": [f"240101{i:04d}" for i in range(1, n_samples + 1)],
        "nama": [f"Mahasiswa {i}" for i in range(1, n_samples + 1)],
        "fakultas_prodi": ["FT/Teknik Informatika"] * n_samples,
        "smt": [2] * n_samples,
        "ips_smt1": ips_smt1,
        "ips_smt2": np.round(np.random.uniform(1.0, 4.0, n_samples), 2),
        "golongan_ukt": np.random.randint(1, 8, n_samples),
        "status_cuti": status_cuti,
        "kode_wilayah": np.random.choice([1, 2, 3], size=n_samples),
        "persen_kehadiran_smt2": base_kehadiran,
        "mk_cekal_uas_smt2": mk_cekal,
    })
    return df


# ============================================================
# 3. Feature Engineering
# ============================================================
def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Membuat fitur turunan delta_ips."""
    print("[2/5] Membuat fitur turunan...")

    df = df.copy()
    df["delta_ips"] = df["ips_smt2"] - df["ips_smt1"]

    print(f"      Fitur delta_ips dibuat. Range: [{df['delta_ips'].min():.2f}, {df['delta_ips'].max():.2f}]")
    return df


# ============================================================
# 4. Buat Target Label Dummy
# ============================================================
def create_target_label(df: pd.DataFrame) -> pd.Series:
    """
    Membuat target label biner (1 = DO, 0 = Tidak DO).

    Prinsip utama:
      - IPS Semester 1 < 3.00 WAJIB Risiko Tinggi (label = 1).
      - Semakin BESAR golongan UKT (1-7), semakin TINGGI risiko DO.
      - UKT tinggi (5-7) / status cuti / IPS semester 2 rendah menambah risiko.
      - Kehadiran < 75% → cekal UAS → nilai E → IPS turun → risiko DO naik.
      - MK cekal >= 2 → indikator kuat mahasiswa bermasalah.
    """
    print("[3/5] Membuat target label dummy...")

    label = pd.Series(np.zeros(len(df), dtype=int), index=df.index)

    # Kondisi 0: IPS semester 1 < 3.00 (Aturan mutlak risiko tinggi)
    cond_ips1_low = df["ips_smt1"] < 3.00

    # Kondisi 1: IPS semester 2 sangat rendah
    cond_ips2_very_low = df["ips_smt2"] < 1.5

    # Kondisi 2: Pernah cuti (1 atau lebih semester)
    cond_cuti = df["status_cuti"] >= 1

    # Kondisi 3: UKT tinggi (>= 6) — mandiri sebagai faktor risiko
    cond_ukt_high = df["golongan_ukt"] >= 6

    # Kondisi 4: UKT 5 + IPS rendah
    cond_ukt5_ips_low = (df["golongan_ukt"] == 5) & (df["ips_smt2"] < 2.5)

    # Kondisi 5: UKT >= 4 + delta IPS turun drastis
    cond_ukt4_delta_drop = (df["golongan_ukt"] >= 4) & (df["delta_ips"] < -0.3)

    # Kondisi 6: Delta IPS anjlok + IPS smt2 rendah
    cond_delta_crash = (df["delta_ips"] < -0.5) & (df["ips_smt2"] < 2.0)

    # Kondisi 7: Delta negatif + wilayah luar (kode_wilayah == 3)
    cond_3t_risk = (df["delta_ips"] < -0.1) & (df["kode_wilayah"] == 3)

    # Kondisi 8: Kehadiran rendah (< 70%) — indikator kuat masalah akademik
    cond_kehadiran_rendah = df["persen_kehadiran_smt2"] < 70.0

    # Kondisi 9: MK cekal UAS >= 2 — mahasiswa dicekal di banyak MK
    cond_cekal_banyak = df["mk_cekal_uas_smt2"] >= 2

    # Kondisi 10: MK cekal >= 1 + IPS rendah (kombinasi masalah)
    cond_cekal_ips_rendah = (df["mk_cekal_uas_smt2"] >= 1) & (df["ips_smt2"] < 2.5)

    # Gabungkan semua kondisi
    label[
        cond_ips1_low | cond_ips2_very_low | cond_cuti | cond_ukt_high
        | cond_ukt5_ips_low | cond_ukt4_delta_drop
        | cond_delta_crash | cond_3t_risk
        | cond_kehadiran_rendah | cond_cekal_banyak | cond_cekal_ips_rendah
    ] = 1

    n_do = label.sum()
    n_total = len(label)
    print(f"      Label: {n_do} DO ({n_do/n_total*100:.0f}%) | {n_total - n_do} Tidak DO ({(n_total-n_do)/n_total*100:.0f}%)")

    return label


# ============================================================
# 5. Training Model XGBoost
# ============================================================
def train_model(X: pd.DataFrame, y: pd.Series) -> XGBClassifier:
    """Melatih XGBClassifier dengan parameter dan monotone_constraints."""
    print("[4/5] Melatih model XGBClassifier...")

    # Monotone constraints (8 fitur, urutan sesuai FEATURE_COLUMNS):
    #   ips_smt1 (-1):               IPS naik → risiko turun
    #   ips_smt2 (-1):               IPS naik → risiko turun
    #   delta_ips (-1):              Delta positif → risiko turun
    #   golongan_ukt (+1):           UKT naik → risiko naik
    #   status_cuti (+1):            Cuti → risiko naik
    #   kode_wilayah (+1):           Wilayah luar → risiko naik
    #   persen_kehadiran_smt2 (-1):  Kehadiran naik → risiko turun
    #   mk_cekal_uas_smt2 (+1):     Cekal naik → risiko naik
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        monotone_constraints=(-1, -1, -1, 1, 1, 1, -1, 1),
        use_label_encoder=False,
        random_state=42,
    )

    model.fit(X, y)

    # Tampilkan feature importance
    importance = model.feature_importances_
    feat_imp = sorted(
        zip(X.columns, importance), key=lambda x: x[1], reverse=True
    )
    print("      Feature Importance:")
    for feat, imp in feat_imp:
        bar = "#" * int(imp * 40)
        print(f"        {feat:<16} {imp:.4f}  {bar}")

    return model


# ============================================================
# 6. Simpan Model
# ============================================================
def save_model(model: XGBClassifier) -> None:
    """Menyimpan model ke file .joblib."""
    print(f"[5/5] Menyimpan model ke {MODEL_PATH}...")
    joblib.dump(model, MODEL_PATH)
    file_size_kb = os.path.getsize(MODEL_PATH) / 1024
    print(f"      Model berhasil disimpan! ({file_size_kb:.1f} KB)")


def train_and_save_model():
    """
    Fungsi programatik untuk melatih ulang model XGBoost dan menyimpannya.
    Mengembalikan (model_object, dict_feature_importance).
    """
    df = fetch_data()
    df = create_features(df)
    y = create_target_label(df)
    X = df[FEATURE_COLUMNS].copy().astype(float)
    model = train_model(X, y)
    save_model(model)

    importance = dict(zip(X.columns, [float(x) for x in model.feature_importances_]))
    return model, importance


# ============================================================
# Main
# ============================================================
def main():
    print("=" * 60)
    print("  Siprido EIS - Training Model XGBoost")
    print("=" * 60)
    print()

    model, importance = train_and_save_model()

    print()
    print("=" * 60)
    print("  Training selesai!")
    print("=" * 60)


if __name__ == "__main__":
    main()
