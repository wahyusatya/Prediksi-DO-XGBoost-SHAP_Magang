-- ============================================================
-- Siprido EIS - Migration: Tambah Fitur Tingkat Kehadiran Per Kuliah
-- Jalankan skrip ini pada database PostgreSQL Docker yang sudah berjalan.
-- ============================================================
-- Konteks bisnis:
--   1 MK = 16 pertemuan. Wajib hadir minimal 12 kali (75%).
--   Hadir <12 kali → cekal UAS → otomatis nilai E → IPS turun.
-- ============================================================

-- ======================
-- 1. Tambah Kolom Baru
-- ======================
ALTER TABLE data_mahasiswa_smt2
    ADD COLUMN IF NOT EXISTS persen_kehadiran_smt2  NUMERIC(5,2) NOT NULL DEFAULT 100.00
        CHECK (persen_kehadiran_smt2 BETWEEN 0.00 AND 100.00);

ALTER TABLE data_mahasiswa_smt2
    ADD COLUMN IF NOT EXISTS mk_cekal_uas_smt2      INT          NOT NULL DEFAULT 0
        CHECK (mk_cekal_uas_smt2 >= 0);

COMMENT ON COLUMN data_mahasiswa_smt2.persen_kehadiran_smt2
    IS 'Rata-rata persentase kehadiran seluruh MK di semester 2 (0-100%). Dihitung dari total hadir / total pertemuan seluruh MK.';
COMMENT ON COLUMN data_mahasiswa_smt2.mk_cekal_uas_smt2
    IS 'Jumlah MK di mana kehadiran <75% (<12 dari 16 pertemuan). MK cekal → otomatis nilai E → menjatuhkan IPS.';

-- ======================
-- 2. Update Data Dummy (25 Mahasiswa)
-- ======================

-- ===== Risiko RENDAH (kehadiran 93.75% - 100%, 0 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 = 100.00, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010001';  -- Andi Saputra     : 16/16 semua MK
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  96.88, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010002';  -- Budi Santoso     : rata-rata 15.5/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  93.75, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010003';  -- Dimas Prasetyo   : rata-rata 15/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  98.44, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010004';  -- Lina Marlina     : rata-rata 15.75/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  95.31, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010005';  -- Rudi Hartono     : rata-rata 15.25/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 = 100.00, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010006';  -- Siti Aminah      : 16/16 semua MK
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  90.63, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010007';  -- Yusuf Maulana    : rata-rata 14.5/16

-- ===== Risiko RENDAH-SEDANG (kehadiran 81.25% - 87.50%, 0-1 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  87.50, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010008';  -- Citra Dewi       : rata-rata 14/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  85.94, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010009';  -- Eka Rahmawati    : rata-rata 13.75/16
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  81.25, mk_cekal_uas_smt2 = 1 WHERE nim = '2401010010';  -- Putra Wijaya     : rata-rata 13/16, 1 MK <12
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  84.38, mk_cekal_uas_smt2 = 0 WHERE nim = '2401010011';  -- Novia Sari       : rata-rata 13.5/16

-- ===== Risiko TINGGI: IPS <3.00 + UKT 4-5 (kehadiran 62.50% - 75.00%, 1-3 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  68.75, mk_cekal_uas_smt2 = 2 WHERE nim = '2401010012';  -- Fajar Nugroho    : rata-rata 11/16, 2 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  75.00, mk_cekal_uas_smt2 = 1 WHERE nim = '2401010013';  -- Mega Puspita     : rata-rata 12/16, 1 MK tepat batas
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  71.88, mk_cekal_uas_smt2 = 2 WHERE nim = '2401010014';  -- Rizky Firmansyah : rata-rata 11.5/16, 2 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  62.50, mk_cekal_uas_smt2 = 3 WHERE nim = '2401010015';  -- Dewi Anggraini   : rata-rata 10/16, 3 MK cekal

-- ===== Risiko TINGGI: IPS <3.00 + UKT 6-7 (kehadiran 43.75% - 62.50%, 3-5 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  56.25, mk_cekal_uas_smt2 = 4 WHERE nim = '2401010016';  -- Gita Permatasari : rata-rata 9/16, 4 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  62.50, mk_cekal_uas_smt2 = 3 WHERE nim = '2401010017';  -- Ahmad Fauzi      : rata-rata 10/16, 3 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  50.00, mk_cekal_uas_smt2 = 4 WHERE nim = '2401010018';  -- Ratna Kusuma     : rata-rata 8/16, 4 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  43.75, mk_cekal_uas_smt2 = 5 WHERE nim = '2401010019';  -- Joko Widodo      : rata-rata 7/16, 5 MK cekal

-- ===== Risiko TINGGI: Cuti / IPS sangat rendah (kehadiran 25.00% - 50.00%, 4-6 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  37.50, mk_cekal_uas_smt2 = 5 WHERE nim = '2401010020';  -- Hadi Kurniawan   : rata-rata 6/16, cuti
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  25.00, mk_cekal_uas_smt2 = 6 WHERE nim = '2401010021';  -- Indah Lestari    : rata-rata 4/16, cuti
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  50.00, mk_cekal_uas_smt2 = 4 WHERE nim = '2401010022';  -- Bagus Setiawan   : rata-rata 8/16, 4 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  31.25, mk_cekal_uas_smt2 = 5 WHERE nim = '2401010023';  -- Wulan Dari       : rata-rata 5/16, cuti

-- ===== Risiko TINGGI: UKT tinggi + IPS turun (kehadiran 53.13% - 59.38%, 3-4 MK cekal) =====
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  53.13, mk_cekal_uas_smt2 = 4 WHERE nim = '2401010024';  -- Hendri Gunawan   : rata-rata 8.5/16, 4 MK cekal
UPDATE data_mahasiswa_smt2 SET persen_kehadiran_smt2 =  59.38, mk_cekal_uas_smt2 = 3 WHERE nim = '2401010025';  -- Maya Sari        : rata-rata 9.5/16, 3 MK cekal

-- ======================
-- 3. Verifikasi
-- ======================
SELECT nim, nama, ips_smt2, persen_kehadiran_smt2, mk_cekal_uas_smt2
FROM data_mahasiswa_smt2
ORDER BY persen_kehadiran_smt2 DESC;
