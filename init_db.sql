-- ============================================================
-- Siprido EIS - Database Initialization Script
-- Database : db_siprido_eis
-- Fokus    : Mahasiswa Semester 2 & 6 Fitur Riil
-- ============================================================

-- ======================
-- 1. Tabel data_mahasiswa_smt2
-- ======================
CREATE TABLE IF NOT EXISTS data_mahasiswa_smt2 (
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

COMMENT ON COLUMN data_mahasiswa_smt2.nim           IS 'Nomor Induk Mahasiswa (NIM)';
COMMENT ON COLUMN data_mahasiswa_smt2.kode_wilayah  IS '1 = Dalam Kec. Buleleng (Kab. Buleleng), 2 = Luar Kec. Buleleng (Kab. Buleleng), 3 = Luar Kec. & Kab. Buleleng';
COMMENT ON COLUMN data_mahasiswa_smt2.asal_daerah   IS 'Nama daerah asal mahasiswa (misal: Singaraja, Seririt, Denpasar, Jawa Tengah)';
COMMENT ON COLUMN data_mahasiswa_smt2.status_cuti   IS 'Jumlah semester cuti yang diambil (0 = tidak pernah cuti, 1 = cuti 1 semester, 2 = cuti 2 semester)';
COMMENT ON COLUMN data_mahasiswa_smt2.golongan_ukt  IS 'Golongan UKT 1 (terendah) s.d. 7 (tertinggi). Semakin besar, semakin tinggi risiko DO.';

-- ======================
-- 2. Tabel prediksi_do
-- ======================
CREATE TABLE IF NOT EXISTS prediksi_do (
    nim             VARCHAR(15)  PRIMARY KEY,
    skor_prediksi   INT          NOT NULL CHECK (skor_prediksi BETWEEN 0 AND 100),
    status_risiko   VARCHAR(10)  NOT NULL CHECK (status_risiko IN ('Tinggi', 'Sedang', 'Rendah')),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_prediksi_mahasiswa
        FOREIGN KEY (nim) REFERENCES data_mahasiswa_smt2(nim)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- ======================
-- Indeks Performa Query
-- ======================
CREATE INDEX IF NOT EXISTS idx_mhs_fakultas_prodi ON data_mahasiswa_smt2(fakultas_prodi);
CREATE INDEX IF NOT EXISTS idx_prediksi_status ON prediksi_do(status_risiko);
CREATE INDEX IF NOT EXISTS idx_prediksi_skor ON prediksi_do(skor_prediksi DESC);

-- ======================
-- 3. Tabel riwayat_intervensi_dpa
-- ======================
CREATE TABLE IF NOT EXISTS intervensi_mahasiswa (
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

CREATE INDEX IF NOT EXISTS idx_intervensi_nim ON intervensi_mahasiswa(nim);

-- ============================================================
-- Catatan Inisialisasi Data:
-- Data mahasiswa riil Semester 2 dimuat secara otomatis
-- melalui pipeline ETL: python app/etl_excel_data.py --load-db
-- ============================================================
