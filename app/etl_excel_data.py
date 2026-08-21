"""
Siprido EIS - ETL & Data Preparation Pipeline (Fokus Semester 2)
===============================================================
Membaca file Excel data mahasiswa asli, memfilter khusus mahasiswa Semester 2,
membersihkan, menyesuaikan struktur data (hanya menampilkan NIM tanpa nama dummy,
dan menggunakan 6 fitur riil), serta mengekspor ke CSV/Excel dan PostgreSQL.
"""

import os
import re
import argparse
import joblib
import numpy as np
import pandas as pd
from sqlalchemy import text

try:
    from database import engine
except ImportError:
    from app.database import engine

# Direktori Proyek
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
OUTPUT_CLEAN_CSV = os.path.join(DATA_DIR, "data_mahasiswa_clean.csv")
OUTPUT_CLEAN_XLSX = os.path.join(DATA_DIR, "data_mahasiswa_clean.xlsx")

# Prefix Fakultas Singkat
FAKULTAS_PREFIX_MAP = {
    "Fakultas Teknik dan Kejuruan": "FTK",
    "Fakultas Bahasa dan Seni": "FBS",
    "Fakultas Matematika dan Ilmu Pengetahuan Alam": "FMIPA",
    "Fakultas Ekonomi": "FE",
    "Fakultas Hukum dan Ilmu Sosial": "FHIS",
    "Fakultas Ilmu Pendidikan": "FIP",
    "Fakultas Olahraga dan Kesehatan": "FOK",
    "Program Pascasarjana": "Pascasarjana",
}

# UKT Mapping
UKT_MAP = {
    "UKT Kelompok 1": 1,
    "UKT Kelompok 2": 2,
    "UKT Kelompok 3": 3,
    "UKT Kelompok 4": 4,
    "UKT Kelompok 5": 5,
    "UKT Kelompok 6": 6,
    "UKT Kelompok 7": 7,
    "Bidikmisi": 1,
    "Dikti Papua": 1,
    "BKT": 7,
    "Pasca Sarjana": 7,
}

FEATURE_COLUMNS = [
    "ips_smt1",
    "ips_smt2",
    "delta_ips",
    "golongan_ukt",
    "status_cuti",
    "kode_wilayah",
]


def parse_riwayat_ips(text: str):
    """Mengekstrak IPS Semester 1 dan Semester 2 dari string riwayat_ips."""
    s1 = re.search(r"Sem\s*1\s*:\s*([\d\.]+)", str(text))
    s2 = re.search(r"Sem\s*2\s*:\s*([\d\.]+)", str(text))
    val1 = float(s1.group(1)) if s1 else None
    val2 = float(s2.group(1)) if s2 else None
    return val1, val2


def map_kode_wilayah(domisili_str: str) -> int:
    """
    1 = Dalam Kec. Buleleng (Kab. Buleleng)
    2 = Luar Kec. Buleleng (Kab. Buleleng)
    3 = Luar Kec. & Kab. Buleleng (Luar Kab. Buleleng / Luar Bali)
    """
    d = str(domisili_str).upper()
    if "BULELENG, BULELENG" in d or "KEC. BULELENG" in d:
        return 1
    elif "BULELENG" in d:
        return 2
    else:
        return 3


def format_asal_daerah(domisili_str: str) -> str:
    """Membersihkan format string asal daerah."""
    parts = [p.strip().title() for p in str(domisili_str).split(",") if p.strip()]
    if len(parts) >= 3:
        return f"Kec. {parts[0]}, Kab. {parts[1]}, Prov. {parts[2]}"
    elif len(parts) == 2:
        return f"Kab. {parts[0]}, Prov. {parts[1]}"
    return str(domisili_str).title()


def map_fakultas_prodi(fakultas: str, jurusan: str) -> str:
    """Format prodi: 'FTK/Teknik Informatika'."""
    fak = FAKULTAS_PREFIX_MAP.get(str(fakultas).strip(), str(fakultas).strip())
    jur = str(jurusan).replace("Jurusan ", "").strip()
    return f"{fak}/{jur}"


def process_excel_dataset(input_excel_path: str) -> pd.DataFrame:
    """Memproses file Excel raw menjadi DataFrame terstruktur khusus Semester 2."""
    print(f"[*] Membaca file: {input_excel_path}")
    df_raw = pd.read_excel(input_excel_path)
    print(f"[*] Total data mentah: {len(df_raw)} baris.")

    clean_records = []

    for _, row in df_raw.iterrows():
        # Parsing IPS Semester 1 & 2 dari riwayat_ips
        ips1, ips2 = parse_riwayat_ips(row.get("riwayat_ips", ""))
        if ips1 is None or ips2 is None:
            continue

        nim = str(row["nim"]).strip()
        fakultas_prodi = map_fakultas_prodi(row.get("fakultas", ""), row.get("jurusan", ""))
        smt = 2

        ips_smt1 = round(float(np.clip(ips1, 0.0, 4.0)), 2)
        ips_smt2 = round(float(np.clip(ips2, 0.0, 4.0)), 2)

        # UKT
        tingkat_ukt_raw = str(row.get("tingkat UKT", "")).strip()
        golongan_ukt = UKT_MAP.get(tingkat_ukt_raw, 3)

        # Status Cuti
        status_cuti = int(row.get("jumlah_cuti", 0)) if pd.notnull(row.get("jumlah_cuti")) else 0

        # Wilayah
        domisili_raw = str(row.get("wilayah domisili", "")).strip()
        kode_wilayah = map_kode_wilayah(domisili_raw)
        asal_daerah = format_asal_daerah(domisili_raw)

        clean_records.append({
            "nim": nim,
            "fakultas_prodi": fakultas_prodi,
            "smt": smt,
            "ips_smt1": ips_smt1,
            "ips_smt2": ips_smt2,
            "golongan_ukt": golongan_ukt,
            "status_cuti": status_cuti,
            "kode_wilayah": kode_wilayah,
            "asal_daerah": asal_daerah,
        })

    df_clean = pd.DataFrame(clean_records).drop_duplicates(subset=["nim"], keep="first")
    print(f"[*] Berhasil memproses {len(df_clean)} mahasiswa yang memiliki riwayat IPS Semester 1 & 2.")
    return df_clean


def sync_to_database(df_clean: pd.DataFrame):
    """Memasukkan data bersih ke PostgreSQL (tabel data_mahasiswa_smt2 & prediksi_do)."""
    print("\n[*] Menghubungkan ke Database PostgreSQL...")
    try:
        with engine.begin() as conn:
            # Recreate table structure to match 6 features (tanpa nama dummy & tanpa kehadiran sintetis)
            conn.execute(text("DROP TABLE IF EXISTS intervensi_mahasiswa, prediksi_do, data_mahasiswa_smt2 CASCADE;"))
            
            conn.execute(text("""
                CREATE TABLE data_mahasiswa_smt2 (
                    nim                    VARCHAR(15)  PRIMARY KEY,
                    fakultas_prodi         VARCHAR(100) NOT NULL,
                    smt                    INT          NOT NULL DEFAULT 2,
                    ips_smt1               NUMERIC(3,2) NOT NULL CHECK (ips_smt1 BETWEEN 0.00 AND 4.00),
                    ips_smt2               NUMERIC(3,2) NOT NULL CHECK (ips_smt2 BETWEEN 0.00 AND 4.00),
                    golongan_ukt           INT          NOT NULL CHECK (golongan_ukt BETWEEN 1 AND 7),
                    status_cuti            INT          NOT NULL DEFAULT 0 CHECK (status_cuti >= 0),
                    kode_wilayah           INT          NOT NULL CHECK (kode_wilayah IN (1, 2, 3)),
                    asal_daerah            VARCHAR(100) NOT NULL DEFAULT '-'
                );
            """))

            conn.execute(text("""
                CREATE TABLE prediksi_do (
                    nim             VARCHAR(15)  PRIMARY KEY,
                    skor_prediksi   INT          NOT NULL CHECK (skor_prediksi BETWEEN 0 AND 100),
                    status_risiko   VARCHAR(10)  NOT NULL CHECK (status_risiko IN ('Tinggi', 'Sedang', 'Rendah')),
                    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_prediksi_mahasiswa
                        FOREIGN KEY (nim) REFERENCES data_mahasiswa_smt2(nim)
                        ON UPDATE CASCADE
                        ON DELETE CASCADE
                );
            """))

            conn.execute(text("""
                CREATE TABLE intervensi_mahasiswa (
                    id              SERIAL PRIMARY KEY,
                    nim             VARCHAR(15) NOT NULL,
                    tanggal         TIMESTAMP NOT NULL DEFAULT NOW(),
                    jenis_tindakan  VARCHAR(100) NOT NULL,
                    catatan         TEXT NOT NULL,
                    petugas         VARCHAR(100) NOT NULL DEFAULT 'DPA / Akademik',
                    CONSTRAINT fk_intervensi_mahasiswa
                        FOREIGN KEY (nim) REFERENCES data_mahasiswa_smt2(nim)
                        ON UPDATE CASCADE
                        ON DELETE CASCADE
                );
            """))

            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mhs_fakultas_prodi ON data_mahasiswa_smt2(fakultas_prodi);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prediksi_status ON prediksi_do(status_risiko);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_prediksi_skor ON prediksi_do(skor_prediksi DESC);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_intervensi_nim ON intervensi_mahasiswa(nim);"))


            # Query Insert Mahasiswa
            query_mhs = text("""
                INSERT INTO data_mahasiswa_smt2
                    (nim, fakultas_prodi, smt, ips_smt1, ips_smt2, golongan_ukt, status_cuti, kode_wilayah, asal_daerah)
                VALUES
                    (:nim, :fakultas_prodi, :smt, :ips_smt1, :ips_smt2, :golongan_ukt, :status_cuti, :kode_wilayah, :asal_daerah);
            """)

            records = df_clean.to_dict(orient="records")
            conn.execute(query_mhs, records)
            print(f"[+] Berhasil mengimpor {len(records)} baris data riil Semester 2 ke 'data_mahasiswa_smt2'.")

            # Hitung skor prediksi jika model tersedia
            model_path = os.path.join(os.path.dirname(__file__), "model_xgboost.joblib")
            if os.path.exists(model_path):
                print("[*] Menghitung skor prediksi risiko DO menggunakan model XGBoost (6 fitur)...")
                model = joblib.load(model_path)

                df_feat = df_clean.copy()
                df_feat["delta_ips"] = df_feat["ips_smt2"] - df_feat["ips_smt1"]
                X = df_feat[FEATURE_COLUMNS].astype(float)
                probas = model.predict_proba(X)[:, 1]

                pred_records = []
                for idx, row in df_feat.iterrows():
                    ips1 = float(row["ips_smt1"])
                    ips2 = float(row["ips_smt2"])
                    delta = float(row["delta_ips"])
                    cuti = int(row["status_cuti"])
                    ukt = int(row["golongan_ukt"])
                    wilayah = int(row["kode_wilayah"])
                    p_raw = probas[idx]

                    if ips1 < 2.75 or ips2 < 2.50 or cuti >= 1:
                        base = 68.0 + max(0.0, (2.75 - min(ips1, ips2))) * 12.0 + cuti * 6.0 + (ukt - 1) * 0.5 + (wilayah - 1) * 0.5
                        final_float = min(98.0, max(70.0, 0.40 * (p_raw * 100) + 0.60 * base))
                    elif delta < -0.40 or ips2 < 2.85:
                        base = 40.0 + (abs(delta) * 15.0 if delta < 0 else 0.0) + max(0.0, (2.85 - ips2)) * 12.0 + (ukt - 1) * 0.8
                        final_float = min(69.0, max(40.0, 0.40 * (p_raw * 100) + 0.60 * base))
                    else:
                        base = 18.0 - (ips1 - 3.00) * 8.0 - (ips2 - 3.00) * 8.0 + (ukt - 1) * 1.2 + (wilayah - 1) * 0.8
                        final_float = min(35.0, max(5.0, 0.40 * (p_raw * 100) + 0.60 * base))

                    skor = int(round(final_float))
                    status = "Tinggi" if skor >= 70 else ("Sedang" if skor >= 40 else "Rendah")
                    pred_records.append({
                        "nim": row["nim"],
                        "skor": skor,
                        "status": status,
                    })

                query_pred = text("""
                    INSERT INTO prediksi_do (nim, skor_prediksi, status_risiko, updated_at)
                    VALUES (:nim, :skor, :status, NOW());
                """)
                conn.execute(query_pred, pred_records)
                print(f"[+] Berhasil mengupdate {len(pred_records)} baris skor prediksi di tabel 'prediksi_do'.")

    except Exception as e:
        print(f"[!] Gagal sinkronisasi ke database: {e}")


def main():
    parser = argparse.ArgumentParser(description="ETL Data Mahasiswa Excel (Fokus Semester 2)")
    parser.add_argument("--load-db", action="store_true", help="Otomatis muat hasil ke Database PostgreSQL")
    args = parser.parse_args()

    excel_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".xlsx") or f.endswith(".xls")]
    if not excel_files:
        print("[!] Tidak ditemukan file Excel di folder data/")
        return

    target_excel = None
    for f in excel_files:
        if "clean" not in f.lower():
            target_excel = os.path.join(DATA_DIR, f)
            break

    if not target_excel:
        target_excel = os.path.join(DATA_DIR, excel_files[0])

    df_clean = process_excel_dataset(target_excel)

    # Simpan ke CSV & XLSX
    df_clean.to_csv(OUTPUT_CLEAN_CSV, index=False)
    df_clean.to_excel(OUTPUT_CLEAN_XLSX, index=False)

    print("\n" + "=" * 60)
    print("  HASIL TRANSFORMASI DATA MAHASISWA (SEMESTER 2)")
    print("=" * 60)
    print(f"Total baris Semester 2        : {len(df_clean)}")
    print(f"File CSV bersih tersimpan     : {OUTPUT_CLEAN_CSV}")
    print(f"File Excel bersih tersimpan   : {OUTPUT_CLEAN_XLSX}")
    print("\nContoh 5 Data Pertama:")
    print(df_clean.head(5).to_string(index=False))
    print("=" * 60)

    if args.load_db:
        sync_to_database(df_clean)


if __name__ == "__main__":
    main()
