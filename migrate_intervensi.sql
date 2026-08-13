-- ============================================================
-- Siprido EIS - Migration Script: Tabel Intervensi Mahasiswa
-- ============================================================

CREATE TABLE IF NOT EXISTS intervensi_mahasiswa (
    id              SERIAL PRIMARY KEY,
    nim             VARCHAR(15) NOT NULL REFERENCES data_mahasiswa_smt2(nim) ON DELETE CASCADE,
    tanggal         TIMESTAMP NOT NULL DEFAULT NOW(),
    jenis_tindakan  VARCHAR(100) NOT NULL,
    catatan         TEXT NOT NULL,
    petugas         VARCHAR(100) NOT NULL DEFAULT 'DPA / Akademik'
);

-- Indeks untuk pencarian cepat berdasarkan NIM dan Tanggal
CREATE INDEX IF NOT EXISTS idx_intervensi_nim ON intervensi_mahasiswa(nim);
CREATE INDEX IF NOT EXISTS idx_intervensi_tanggal ON intervensi_mahasiswa(tanggal DESC);

COMMENT ON TABLE intervensi_mahasiswa IS 'Tabel pencatatan riwayat tindakan intervensi / bimbingan akademik untuk mahasiswa berisiko DO';
COMMENT ON COLUMN intervensi_mahasiswa.jenis_tindakan IS 'Contoh: Bimbingan Akademik DPA, Pengajuan Keringanan UKT, SP-1, Program Remedial';
