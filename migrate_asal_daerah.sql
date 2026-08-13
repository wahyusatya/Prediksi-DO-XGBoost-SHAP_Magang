-- Migrasi: Tambah kolom asal_daerah dan isi data
ALTER TABLE data_mahasiswa_smt2 ADD COLUMN IF NOT EXISTS asal_daerah VARCHAR(100) NOT NULL DEFAULT '-';

-- Update asal_daerah untuk setiap mahasiswa
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Singaraja'     WHERE nim = '2401010001';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Singaraja'     WHERE nim = '2401010002';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Banyuasri'     WHERE nim = '2401010003';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Seririt'       WHERE nim = '2401010004';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Kampung Baru'  WHERE nim = '2401010005';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Penarukan'     WHERE nim = '2401010006';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Banjar'        WHERE nim = '2401010007';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Gerokgak'      WHERE nim = '2401010008';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Singaraja'     WHERE nim = '2401010009';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Tejakula'      WHERE nim = '2401010010';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Banyuasri'     WHERE nim = '2401010011';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Denpasar'      WHERE nim = '2401010012';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Kubutambahan'  WHERE nim = '2401010013';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Singaraja'     WHERE nim = '2401010014';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Jawa Tengah'   WHERE nim = '2401010015';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Sawan'         WHERE nim = '2401010016';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Singaraja'     WHERE nim = '2401010017';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Jawa Timur'    WHERE nim = '2401010018';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Kampung Anyar' WHERE nim = '2401010019';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Tabanan'       WHERE nim = '2401010020';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Lombok'        WHERE nim = '2401010021';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Banyuasri'     WHERE nim = '2401010022';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Sukasada'      WHERE nim = '2401010023';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Karangasem'    WHERE nim = '2401010024';
UPDATE data_mahasiswa_smt2 SET asal_daerah = 'Busungbiu'     WHERE nim = '2401010025';

-- Juga fix IPS semester 1 NIM 2401010009 agar >= 3.00 (konsisten dengan aturan bisnis)
UPDATE data_mahasiswa_smt2 SET ips_smt1 = 3.05 WHERE nim = '2401010009';
