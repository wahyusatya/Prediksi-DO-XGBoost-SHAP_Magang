"""
Siprido EIS - Script Training Model XGBoost (Fokus Semester 2 & 6 Fitur Riil)
=============================================================================
Melatih model XGBClassifier dengan 6 fitur riil untuk memprediksi risiko DO:
1. ips_smt1     : Indeks Prestasi Semester 1
2. ips_smt2     : Indeks Prestasi Semester 2
3. delta_ips    : Perubahan IPS (Semester 1 ke Semester 2)
4. golongan_ukt : Golongan UKT (1 s.d. 7)
5. status_cuti  : Riwayat cuti akademik
6. kode_wilayah : Domisili (1: Kec. Buleleng, 2: Luar Kec. Kab. Buleleng, 3: Luar Kab. / Bali)
"""

import os
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier

try:
    from database import engine
except ImportError:
    from app.database import engine

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


def fetch_data() -> pd.DataFrame:
    """Mengambil data mahasiswa Semester 2 dari PostgreSQL atau file dataset riil."""
    print("[1/4] Mengambil data mahasiswa Semester 2...")
    try:
        df = pd.read_sql("SELECT * FROM data_mahasiswa_smt2 WHERE smt = 2;", engine)
        if not df.empty:
            print(f"      Berhasil memuat {len(df)} baris data riil dari database.")
            return df
    except Exception as e:
        print(f"      [Info] Database offline ({e}). Membaca dari file dataset riil...")

    csv_path = os.path.join(os.path.dirname(SCRIPT_DIR), "data", "data_mahasiswa_clean.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        print(f"      Berhasil memuat {len(df)} baris data riil dari {csv_path}.")
        return df

    xlsx_path = os.path.join(os.path.dirname(SCRIPT_DIR), "data", "data_mahasiswa_clean.xlsx")
    if os.path.exists(xlsx_path):
        df = pd.read_excel(xlsx_path)
        print(f"      Berhasil memuat {len(df)} baris data riil dari {xlsx_path}.")
        return df

    raise FileNotFoundError(f"Tidak ditemukan data mahasiswa di database ataupun di folder data/ ({csv_path})")


def create_target_label(df: pd.DataFrame) -> pd.Series:
    """Membuat target label biner (1 = DO / Risiko Tinggi, 0 = Tidak DO / Risiko Rendah-Sedang)."""
    print("[2/4] Membuat target label...")
    is_do = (
        (df["ips_smt2"] < 2.00)
        | (df["ips_smt1"] < 2.00)
        | (df["status_cuti"] >= 1)
        | ((df["delta_ips"] < -1.00) & (df["ips_smt2"] < 2.75))
        | ((df["golongan_ukt"] >= 6) & (df["ips_smt2"] < 2.50))
        | ((df["golongan_ukt"] >= 5) & (df["delta_ips"] < -0.50))
        | ((df["kode_wilayah"] == 3) & (df["delta_ips"] < -0.75))
    )
    n_do, n_total = is_do.sum(), len(is_do)
    print(f"      Label: {n_do} DO/Risiko Tinggi ({n_do/n_total*100:.0f}%) | {n_total - n_do} Tidak DO/Aman ({(n_total-n_do)/n_total*100:.0f}%)")
    return is_do.astype(int)


def train_model(X: pd.DataFrame, y: pd.Series) -> XGBClassifier:
    """Melatih XGBClassifier dengan 6 fitur riil dan monotone_constraints."""
    print("[3/4] Melatih model XGBClassifier (6 Fitur)...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        monotone_constraints=(-1, -1, -1, 1, 1, 1),
        random_state=42,
    )
    model.fit(X, y)
    return model


def save_model(model: XGBClassifier) -> None:
    """Menyimpan model ke file .joblib."""
    print(f"[4/4] Menyimpan model ke {MODEL_PATH}...")
    joblib.dump(model, MODEL_PATH)
    file_size_kb = os.path.getsize(MODEL_PATH) / 1024
    print(f"      Model berhasil disimpan! ({file_size_kb:.1f} KB)")


def train_and_save_model():
    """Fungsi programatik untuk melatih ulang model XGBoost dan menyimpannya."""
    df = fetch_data()
    df["delta_ips"] = df["ips_smt2"] - df["ips_smt1"]
    y = create_target_label(df)
    X = df[FEATURE_COLUMNS].astype(float)
    model = train_model(X, y)
    save_model(model)
    importance = {col: float(val) for col, val in zip(FEATURE_COLUMNS, model.feature_importances_)}
    return model, importance


if __name__ == "__main__":
    print("=" * 60)
    print("  Siprido EIS - Training Model XGBoost (6 Fitur Semester 2)")
    print("=" * 60)
    train_and_save_model()
    print("  Training selesai!")
    print("=" * 60)
