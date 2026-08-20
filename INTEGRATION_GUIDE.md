# Siprido EIS - Panduan Integrasi SIAKAD/IES & Deployment Produksi (Enterprise Guide)

Dokumen ini ditujukan untuk **Pengembang (Developer) & Tim IT Kampus** yang ingin memasang (*setup*), mengoperasikan, dan mengintegrasikan **Siprido EIS (Sistem Informasi Eksekutif Prediksi Drop Out Mahasiswa)** dengan sistem eksisting seperti **SIAKAD** (Sistem Informasi Akademik) atau **IES** (Executive Information System Utama Universitas).

---

## 1. Arsitektur System & Alur Data

```
+------------------+       +-------------------+       +-----------------------+
|  SIAKAD / SIMKEU | ----> |  Siprido API      | ----> |  PostgreSQL Database  |
|  (Data Akademik) |       |  (FastAPI Server) |       |  (Tabel & Prediksi)   |
+------------------+       +-------------------+       +-----------------------+
                                    |
                                    v
                           +-------------------+
                           |  Frontend Next.js |
                           |  (Dashboard UI)   |
                           +-------------------+
```

---

## 2. Panduan Setup & Deployment Produksi

### Opsi A: Deployment Menggunakan Docker Compose (Direkomendasikan)

1. **Clone & Buat Environment Variable**:
   ```bash
   cp .env.example .env
   ```
2. **Jalankan Cluster Production (PostgreSQL + FastAPI)**:
   ```bash
   docker compose up -d --build
   ```
3. **Inisialisasi Database (Jika Belum Otomatis Termuat)**:
   ```bash
   docker exec -i db_siprido psql -U root -d db_siprido_eis < init_db.sql
   ```
4. **Verifikasi Server & OpenAPI Docs**:
   - API Docs: `http://localhost:8000/docs`
   - Healthcheck: `http://localhost:8000/api/v1/mahasiswa`
   - Macro Insights: `http://localhost:8000/api/v1/analytics/macro-insights`

---

## 3. Panduan Integrasi SIAKAD / IES Eksisting

Untuk menghubungkan data dari SIAKAD/IES kampus ke Siprido EIS, developer dapat memilih 2 metode:

### Metode 1: Push Data Massal via REST API (`POST /api/v1/mahasiswa/bulk-sync`)

SIAKAD dapat mengirimkan data mahasiswa semester 2 secara otomatis pada setiap pergantian periode/bulan dengan **6 fitur riil**:

* **Endpoint**: `POST /api/v1/mahasiswa/bulk-sync`
* **Content-Type**: `application/json`
* **Payload Example**:
  ```json
  {
    "data": [
      {
        "nim": "2401010099",
        "fakultas_prodi": "FTK/Teknik Informatika",
        "smt": 2,
        "ips_smt1": 2.40,
        "ips_smt2": 2.10,
        "golongan_ukt": 5,
        "status_cuti": 0,
        "kode_wilayah": 2,
        "asal_daerah": "Kec. Seririt, Kab. Buleleng"
      }
    ]
  }
  ```
* **Respon (200 OK)**:
  Siprido akan langsung menyimpan data ke DB, menghitung skor prediksi DO real-time secara dinamis, dan meng-upsert hasilnya ke tabel `prediksi_do`.

* **Testing Integrasi Otomatis**:
  Tersedia skrip simulasi pengiriman batch mahasiswa di root direktori:
  ```bash
  python test_bulk_sync_scenario.py
  ```

---

### Metode 2: Direct Database View / ETL Sync (PostgreSQL to PostgreSQL)

Jika universitas menggunakan ETL Pipeline (seperti Apache Airflow, Pentaho, atau Cron Job SQL):
1. ETL menyalin data agregat mahasiswa dari DB SIAKAD ke tabel `data_mahasiswa_smt2`.
2. Panggil API Sync atau jalankan query trigger untuk memperbarui hasil prediksi DO.

---

## 4. API Analisis Makro (`GET /api/v1/analytics/macro-insights`)

Untuk kebutuhan dashboard IES Rektorat / pimpinan universitas yang memerlukan agregasi makro:
* **Endpoint**: `GET /api/v1/analytics/macro-insights`
* **Query Params (Opsional)**: `fakultas`, `semester`
* **Respon**: Mengembalikan distribusi persentase pilar pemicu (*Akademik*, *Finansial & Wilayah*, *Kedisiplinan & Keaktifan*) serta Top 3 faktor risiko global universitas/fakultas.

---

## 5. Panduan MLOps: Pelatihan Ulang Model (Automated Retraining)

Seiring bertambahnya data angkatan baru, model XGBoost dapat dilatih ulang secara berkala agar makin presisi.

### Melatih Ulang & Hot-Reload via REST API (Tanpa Restart Server)

Tim IT/Admin dapat memicu *retraining* kapan saja melalui API:
* **Endpoint**: `POST /api/v1/admin/retrain`
* **Respon (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Model XGBoost berhasil dilatih ulang & di-hot reload di memory API.",
    "feature_importances": {
      "ips_smt1": 0.3850,
      "ips_smt2": 0.2920,
      "delta_ips": 0.1450,
      "status_cuti": 0.0880,
      "golongan_ukt": 0.0550,
      "kode_wilayah": 0.0350
    }
  }
  ```

---

## 6. API Modul Intervensi & Action Tracker (Untuk DPA & Kaprodi)

Siprido menyediakan endpoint untuk mencatat tindakan bimbingan akademik bagi mahasiswa berisiko:

### 1. Mengambil Riwayat Intervensi
* `GET /api/v1/mahasiswa/{nim}/intervensi`

### 2. Menambahkan Catatan Intervensi Baru
* `POST /api/v1/mahasiswa/{nim}/intervensi`
* **Payload**:
  ```json
  {
    "jenis_tindakan": "Bimbingan Akademik DPA",
    "catatan": "DPA memberikan arahan perbaikan nilai dan rekomendasi keringanan UKT.",
    "petugas": "Dr. Wayan (DPA)"
  }
  ```

---

## 7. Rekomendasi Keamanan & Skalabilitas Produksi

1. **Restriksi CORS & Environment**:
   Pastikan variabel `ALLOWED_ORIGINS` di `.env` hanya mengizinkan domain IES/SIAKAD resmi universitas.
2. **Reverse Proxy (Nginx / Traefik)**:
   Gunakan Nginx di depan FastAPI untuk menangani SSL/TLS (HTTPS) dan *rate limiting*.
3. **Database Indexing**:
   Tabel `data_mahasiswa_smt2`, `prediksi_do`, dan `intervensi_mahasiswa` telah dilengkapi indeks pada kolom `nim`, `fakultas_prodi`, dan `status_risiko` untuk performa query cepat pada data hingga 100.000+ mahasiswa.
