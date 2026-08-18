"""
Siprido EIS - Script Training Model XGBoost
=============================================
Melatih model XGBClassifier dengan 8 fitur untuk memprediksi risiko DO.
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
    "persen_kehadiran_smt2",
    "mk_cekal_uas_smt2",
]


def fetch_data() -> pd.DataFrame:
    """Mengambil data mahasiswa semester 2 dari PostgreSQL atau menggunakan synthetic dataset jika DB offline."""
    print("[1/4] Mengambil data mahasiswa...")
    try:
        df = pd.read_sql("SELECT * FROM data_mahasiswa_smt2;", engine)
        print(f"      Berhasil memuat {len(df)} baris data dari database.")
        return df
    except Exception as e:
        print(f"      [Info] Database offline ({e}). Menggunakan dataset sintetis...")

    np.random.seed(42)
    n_samples = 300

    ips_smt1 = np.round(np.random.uniform(1.0, 4.0, n_samples), 2)
    status_cuti = np.random.choice([0, 1, 2], p=[0.80, 0.12, 0.08], size=n_samples)

    base_kehadiran = np.clip(ips_smt1 / 4.0 * 80 + np.random.uniform(0, 20, n_samples), 25, 100)
    cuti_mask = status_cuti > 0
    base_kehadiran[cuti_mask] *= np.random.uniform(0.3, 0.6, cuti_mask.sum())
    base_kehadiran = np.clip(np.round(base_kehadiran, 2), 0, 100)

    # Vektorisasi generate MK cekal
    cekal_limit = np.clip(((75 - base_kehadiran) // 8 + 1).astype(int), 1, 7)
    mk_cekal = np.where(base_kehadiran < 75, np.random.randint(1, cekal_limit + 1), 0)

    return pd.DataFrame({
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


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """Membuat fitur turunan delta_ips."""
    df = df.copy()
    df["delta_ips"] = df["ips_smt2"] - df["ips_smt1"]
    return df


def create_target_label(df: pd.DataFrame) -> pd.Series:
    """Membuat target label biner (1 = DO, 0 = Tidak DO) berbasis aturan akademik."""
    print("[2/4] Membuat target label...")
    is_do = (
        (df["ips_smt1"] < 3.00)
        | (df["ips_smt2"] < 1.5)
        | (df["status_cuti"] >= 1)
        | (df["golongan_ukt"] >= 6)
        | ((df["golongan_ukt"] == 5) & (df["ips_smt2"] < 2.5))
        | ((df["golongan_ukt"] >= 4) & (df["delta_ips"] < -0.3))
        | ((df["delta_ips"] < -0.5) & (df["ips_smt2"] < 2.0))
        | ((df["delta_ips"] < -0.1) & (df["kode_wilayah"] == 3))
        | (df["persen_kehadiran_smt2"] < 70.0)
        | (df["mk_cekal_uas_smt2"] >= 2)
        | ((df["mk_cekal_uas_smt2"] >= 1) & (df["ips_smt2"] < 2.5))
    )
    n_do, n_total = is_do.sum(), len(is_do)
    print(f"      Label: {n_do} DO ({n_do/n_total*100:.0f}%) | {n_total - n_do} Tidak DO ({(n_total-n_do)/n_total*100:.0f}%)")
    return is_do.astype(int)


def train_model(X: pd.DataFrame, y: pd.Series) -> XGBClassifier:
    """Melatih XGBClassifier dengan monotone_constraints."""
    print("[3/4] Melatih model XGBClassifier...")
    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        monotone_constraints=(-1, -1, -1, 1, 1, 1, -1, 1),
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
    df = create_features(df)
    y = create_target_label(df)
    X = df[FEATURE_COLUMNS].copy().astype(float)
    model = train_model(X, y)
    save_model(model)
    importance = dict(zip(X.columns, [float(x) for x in model.feature_importances_]))
    return model, importance


if __name__ == "__main__":
    print("=" * 60)
    print("  Siprido EIS - Training Model XGBoost")
    print("=" * 60)
    train_and_save_model()
    print("  Training selesai!")
    print("=" * 60)
