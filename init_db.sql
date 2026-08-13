-- ============================================================
-- Siprido EIS - Database Initialization Script
-- Database : db_siprido_eis
-- ============================================================

-- ======================
-- 1. Tabel data_mahasiswa_smt2
-- ======================
CREATE TABLE IF NOT EXISTS data_mahasiswa_smt2 (
    nim                    VARCHAR(15)  PRIMARY KEY,
    nama                   VARCHAR(100) NOT NULL,
    fakultas_prodi         VARCHAR(100) NOT NULL,
    smt                    INT          NOT NULL DEFAULT 2,
    ips_smt1               NUMERIC(3,2) NOT NULL CHECK (ips_smt1 BETWEEN 0.00 AND 4.00),
    ips_smt2               NUMERIC(3,2) NOT NULL CHECK (ips_smt2 BETWEEN 0.00 AND 4.00),
    golongan_ukt           INT          NOT NULL CHECK (golongan_ukt BETWEEN 1 AND 7),
    status_cuti            INT          NOT NULL DEFAULT 0 CHECK (status_cuti >= 0),
    kode_wilayah           INT          NOT NULL CHECK (kode_wilayah IN (1, 2, 3)),
    asal_daerah            VARCHAR(100) NOT NULL DEFAULT '-',
    persen_kehadiran_smt2  NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (persen_kehadiran_smt2 BETWEEN 0.00 AND 100.00),
    mk_cekal_uas_smt2      INT          NOT NULL DEFAULT 0     CHECK (mk_cekal_uas_smt2 >= 0)
    -- kode_wilayah: 1 = Dalam Kec. Buleleng (Kab. Buleleng), 2 = Luar Kec. Buleleng (Kab. Buleleng), 3 = Luar Kec. & Kab. Buleleng
    -- persen_kehadiran_smt2: Rata-rata persentase kehadiran seluruh MK di semester 2 (0.00 - 100.00)
    -- mk_cekal_uas_smt2:    Jumlah MK dengan kehadiran <75% (<12 dari 16 pertemuan), mahasiswa dicekal UAS → otomatis nilai E
);

COMMENT ON COLUMN data_mahasiswa_smt2.kode_wilayah IS '1 = Dalam Kec. Buleleng (Kab. Buleleng), 2 = Luar Kec. Buleleng (Kab. Buleleng), 3 = Luar Kec. & Kab. Buleleng';
COMMENT ON COLUMN data_mahasiswa_smt2.asal_daerah  IS 'Nama daerah asal mahasiswa (misal: Singaraja, Seririt, Denpasar, Jawa Tengah)';
COMMENT ON COLUMN data_mahasiswa_smt2.status_cuti  IS 'Jumlah semester cuti yang diambil (0 = tidak pernah cuti, 1 = cuti 1 semester, 2 = cuti 2 semester)';
COMMENT ON COLUMN data_mahasiswa_smt2.golongan_ukt IS 'Golongan UKT 1 (terendah) s.d. 7 (tertinggi). Semakin besar, semakin tinggi risiko DO.';
COMMENT ON COLUMN data_mahasiswa_smt2.persen_kehadiran_smt2 IS 'Rata-rata persentase kehadiran seluruh MK di semester 2 (0-100%). Dihitung dari total hadir / total pertemuan seluruh MK.';
COMMENT ON COLUMN data_mahasiswa_smt2.mk_cekal_uas_smt2     IS 'Jumlah MK di mana kehadiran <75% (<12 dari 16 pertemuan). MK cekal → otomatis nilai E → menjatuhkan IPS.';

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
-- Indeks Performa Query (Indexing Optimization)
-- ======================
CREATE INDEX IF NOT EXISTS idx_mhs_fakultas_prodi ON data_mahasiswa_smt2(fakultas_prodi);
CREATE INDEX IF NOT EXISTS idx_prediksi_status ON prediksi_do(status_risiko);
CREATE INDEX IF NOT EXISTS idx_prediksi_skor ON prediksi_do(skor_prediksi DESC);

-- ======================
-- 3. Data Dummy Mahasiswa Semester 2 (25 mahasiswa)
-- ======================
-- Catatan desain data:
--   IPS Smt1 >= 3.00 → Risiko RENDAH/SEDANG
--   IPS Smt1 < 3.00  → Risiko TINGGI (aturan mutlak)
--   kode_wilayah 1 = Dalam Kec. Buleleng (risiko rendah)
--   kode_wilayah 2 = Luar Kec. Buleleng, Kab. Buleleng (risiko sedang)
--   kode_wilayah 3 = Luar Kec. & Kab. Buleleng (risiko tinggi)
--   persen_kehadiran_smt2: Rata-rata % kehadiran seluruh MK. 1 MK = 16 pertemuan.
--   mk_cekal_uas_smt2:    Jumlah MK dengan kehadiran <75% (<12/16). Cekal UAS → nilai E → IPS turun.

INSERT INTO data_mahasiswa_smt2
    (nim, nama, fakultas_prodi, smt, ips_smt1, ips_smt2, golongan_ukt, status_cuti, kode_wilayah, asal_daerah, persen_kehadiran_smt2, mk_cekal_uas_smt2)
VALUES
    -- ===== Risiko RENDAH: IPS >= 3.00 + UKT rendah + Dalam Kec. Buleleng =====
    -- Kehadiran tinggi (93.75% - 100%), 0 MK cekal
    ('2401010001', 'Andi Saputra',       'FKIP/Pend. Matematika',       2, 3.75, 3.82, 1, 0, 1, 'Singaraja',      100.00, 0),  -- 16/16 semua MK
    ('2401010002', 'Budi Santoso',       'FT/Teknik Informatika',       2, 3.50, 3.55, 2, 0, 1, 'Singaraja',       96.88, 0),  -- rata-rata 15.5/16
    ('2401010003', 'Dimas Prasetyo',     'FMIPA/Biologi',               2, 3.40, 3.30, 2, 0, 1, 'Banyuasri',       93.75, 0),  -- rata-rata 15/16
    ('2401010004', 'Lina Marlina',       'FEB/Manajemen',               2, 3.60, 3.70, 1, 0, 2, 'Seririt',         98.44, 0),  -- rata-rata 15.75/16
    ('2401010005', 'Rudi Hartono',       'FH/Ilmu Hukum',               2, 3.20, 3.25, 2, 0, 1, 'Kampung Baru',    95.31, 0),  -- rata-rata 15.25/16
    ('2401010006', 'Siti Aminah',        'FKIP/Pend. Bahasa Indonesia', 2, 3.30, 3.40, 1, 0, 1, 'Penarukan',      100.00, 0),  -- 16/16 semua MK
    ('2401010007', 'Yusuf Maulana',      'FT/Teknik Mesin',             2, 3.10, 3.20, 3, 0, 2, 'Banjar',          90.63, 0),  -- rata-rata 14.5/16

    -- ===== Risiko RENDAH-SEDANG: IPS >= 3.00 / mendekati 3.00, UKT 3-4 =====
    -- Kehadiran cukup baik (81.25% - 87.50%), 0-1 MK cekal
    ('2401010008', 'Citra Dewi',         'FEB/Manajemen',               2, 3.00, 2.85, 3, 0, 2, 'Gerokgak',        87.50, 0),  -- rata-rata 14/16, semua di atas 75%
    ('2401010009', 'Eka Rahmawati',      'FH/Ilmu Hukum',               2, 3.05, 2.90, 3, 0, 1, 'Singaraja',       85.94, 0),  -- rata-rata 13.75/16
    ('2401010010', 'Putra Wijaya',       'FISIP/Ilmu Komunikasi',       2, 3.00, 2.60, 4, 0, 2, 'Tejakula',        81.25, 1),  -- rata-rata 13/16, 1 MK <12 hadir
    ('2401010011', 'Novia Sari',         'FMIPA/Matematika',            2, 3.10, 2.75, 3, 0, 1, 'Banyuasri',       84.38, 0),  -- rata-rata 13.5/16

    -- ===== Risiko TINGGI: IPS Smt1 < 3.00 + UKT 4-5 + IPS turun =====
    -- Kehadiran rendah (62.50% - 75.00%), 1-3 MK cekal
    ('2401010012', 'Fajar Nugroho',      'FT/Teknik Sipil',             2, 2.50, 2.10, 4, 0, 3, 'Denpasar',        68.75, 2),  -- rata-rata 11/16, 2 MK <12 hadir
    ('2401010013', 'Mega Puspita',       'FEB/Akuntansi',               2, 2.60, 2.30, 5, 0, 2, 'Kubutambahan',    75.00, 1),  -- rata-rata 12/16, 1 MK tepat batas bawah
    ('2401010014', 'Rizky Firmansyah',   'FT/Teknik Informatika',       2, 2.40, 2.20, 4, 0, 1, 'Singaraja',       71.88, 2),  -- rata-rata 11.5/16, 2 MK <12 hadir
    ('2401010015', 'Dewi Anggraini',     'FKIP/Pend. Matematika',       2, 2.30, 2.00, 5, 0, 3, 'Jawa Tengah',     62.50, 3),  -- rata-rata 10/16, 3 MK <12 hadir

    -- ===== Risiko TINGGI: IPS < 3.00 + UKT 6-7 =====
    -- Kehadiran sangat rendah (43.75% - 62.50%), 3-5 MK cekal
    ('2401010016', 'Gita Permatasari',   'FISIP/Ilmu Komunikasi',       2, 2.00, 1.80, 7, 0, 2, 'Sawan',           56.25, 4),  -- rata-rata 9/16, 4 MK <12 hadir
    ('2401010017', 'Ahmad Fauzi',        'FEB/Manajemen',               2, 2.50, 2.40, 6, 0, 1, 'Singaraja',       62.50, 3),  -- rata-rata 10/16, 3 MK <12 hadir
    ('2401010018', 'Ratna Kusuma',       'FMIPA/Biologi',               2, 2.20, 1.90, 6, 0, 3, 'Jawa Timur',      50.00, 4),  -- rata-rata 8/16, 4 MK <12 hadir
    ('2401010019', 'Joko Widodo',        'FKIP/Pend. Bahasa Inggris',   2, 1.80, 1.50, 7, 0, 1, 'Kampung Anyar',   43.75, 5),  -- rata-rata 7/16, 5 MK <12 hadir

    -- ===== Risiko TINGGI: IPS < 3.00 + Cuti / IPS sangat rendah =====
    -- Kehadiran sangat rendah / cuti (25.00% - 50.00%), 4-6 MK cekal
    ('2401010020', 'Hadi Kurniawan',     'FT/Teknik Informatika',       2, 1.50, 1.20, 1, 1, 3, 'Tabanan',         37.50, 5),  -- rata-rata 6/16, cuti 1 smt + 5 MK cekal
    ('2401010021', 'Indah Lestari',      'FEB/Akuntansi',               2, 1.80, 0.90, 2, 2, 3, 'Lombok',          25.00, 6),  -- rata-rata 4/16, cuti 2 smt + 6 MK cekal
    ('2401010022', 'Bagus Setiawan',     'FH/Ilmu Hukum',               2, 1.40, 1.10, 3, 0, 1, 'Banyuasri',       50.00, 4),  -- rata-rata 8/16, 4 MK <12 hadir
    ('2401010023', 'Wulan Dari',         'FISIP/Ilmu Politik',          2, 1.60, 1.30, 5, 1, 2, 'Sukasada',        31.25, 5),  -- rata-rata 5/16, cuti 1 smt + 5 MK cekal

    -- ===== Risiko TINGGI: IPS < 3.00 + UKT tinggi + IPS turun =====
    -- Kehadiran rendah (53.13% - 59.38%), 3-4 MK cekal
    ('2401010024', 'Hendri Gunawan',     'FT/Teknik Sipil',             2, 2.10, 1.60, 7, 0, 3, 'Karangasem',      53.13, 4),  -- rata-rata 8.5/16, 4 MK <12 hadir
    ('2401010025', 'Maya Sari',          'FKIP/Pend. Bahasa Inggris',   2, 2.30, 1.70, 6, 0, 2, 'Busungbiu',       59.38, 3);  -- rata-rata 9.5/16, 3 MK <12 hadir

-- ======================
-- 4. Data Dummy Prediksi DO
-- ======================
-- CATATAN: Skor di tabel ini hanya sebagai placeholder.
-- API menghitung skor secara real-time menggunakan model XGBoost
-- sehingga dashboard dan detail selalu konsisten.
INSERT INTO prediksi_do
    (nim, skor_prediksi, status_risiko, updated_at)
VALUES
    ('2401010001',  5,  'Rendah',  NOW()),
    ('2401010002',  8,  'Rendah',  NOW()),
    ('2401010003', 10,  'Rendah',  NOW()),
    ('2401010004',  6,  'Rendah',  NOW()),
    ('2401010005',  9,  'Rendah',  NOW()),
    ('2401010006',  7,  'Rendah',  NOW()),
    ('2401010007', 12,  'Rendah',  NOW()),
    ('2401010008', 25,  'Rendah',  NOW()),
    ('2401010009', 20,  'Rendah',  NOW()),
    ('2401010010', 35,  'Rendah',  NOW()),
    ('2401010011', 22,  'Rendah',  NOW()),
    ('2401010012', 45,  'Sedang',  NOW()),
    ('2401010013', 50,  'Sedang',  NOW()),
    ('2401010014', 40,  'Sedang',  NOW()),
    ('2401010015', 55,  'Sedang',  NOW()),
    ('2401010016', 80,  'Tinggi',  NOW()),
    ('2401010017', 70,  'Tinggi',  NOW()),
    ('2401010018', 78,  'Tinggi',  NOW()),
    ('2401010019', 85,  'Tinggi',  NOW()),
    ('2401010020', 88,  'Tinggi',  NOW()),
    ('2401010021', 92,  'Tinggi',  NOW()),
    ('2401010022', 75,  'Tinggi',  NOW()),
    ('2401010023', 90,  'Tinggi',  NOW()),
    ('2401010024', 87,  'Tinggi',  NOW()),
    ('2401010025', 82,  'Tinggi',  NOW());
