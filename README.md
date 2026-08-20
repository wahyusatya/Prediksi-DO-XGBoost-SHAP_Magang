# Siprido EIS — Sistem Informasi Eksekutif Prediksi Drop Out Mahasiswa
> **Executive Information System (EIS)** berbasis Machine Learning (XGBoost + SHAP) dan FastAPI + Next.js 16 untuk memprediksi risiko Drop Out (DO) mahasiswa semester 2, menyajikan analisis pola makro institusi, serta memberikan analisis faktor pemicu SHAP dan rekomendasi preskriptif kebijakan.

---

## Prasyarat Perangkat (Prerequisites)

Sebelum melakukan setup pada **perangkat/laptop baru**, pastikan perangkat Anda sudah terinstall:

1. **Git**: Untuk mengkloning repositori.
2. **Docker & Docker Desktop**: *(Direkomendasikan)* Untuk menjalankan Database PostgreSQL & Backend API secara otomatis.
3. **Node.js (v18+) & npm**: Untuk menjalankan Frontend Next.js.
4. **Python (v3.10+)**: *(Jika ingin menjalankan Backend secara lokal tanpa Docker)*.

---

## Panduan Setup & Cara Menjalankan di Perangkat Baru

### Langkah 1: Kloning Repositori & Persiapan Environment

Buka Terminal / PowerShell, lalu jalankan:
```bash
# 1. Kloning repositori
git clone <repository_url>
cd "Prediksi DO"

# 2. Salin template environment variables
cp .env.example .env
```

---

### Langkah 2: Menjalankan Backend API & Database

Anda dapat memilih **salah satu** dari 2 opsi di bawah ini:

#### Opsi A: Menggunakan Docker (Paling Mudah & Direkomendasikan)

1. Pastikan aplikasi **Docker Desktop** sudah berjalan di komputer Anda.
2. Jalankan kontainer database PostgreSQL & API FastAPI dengan perintah:
   ```bash
   docker compose up -d --build
   ```
3. Inisialisasi struktur database (jika belum otomatis termuat):
   ```bash
   docker exec -i db_siprido psql -U root -d db_siprido_eis < init_db.sql
   ```
4. **Verifikasi Backend**: Buka browser ke **`http://localhost:8000/docs`** untuk melihat Swagger / OpenAPI Interactive Documentation.

---

#### Opsi B: Tanpa Docker (Menjalankan Python & PostgreSQL Lokal)

1. Install **PostgreSQL 15** lokal. Buat database bernama `db_siprido_eis` dengan kredensial:
   - User: `root` | Password: `rootpassword` | Port: `5433`
2. Impor struktur tabel & relasi ke PostgreSQL:
   ```bash
   psql -U root -d db_siprido_eis -f init_db.sql
   ```
3. Masuk ke direktori `app` dan buat virtual environment Python:
   ```bash
   cd app
   python -m venv venv
   ```
4. Aktifkan virtual environment:
   - **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
   - **Linux / macOS**: `source venv/bin/activate`
5. Install dependensi backend Python:
   ```bash
   pip install -r requirements.txt
   ```
6. *(Opsional)* Jalankan pipeline ETL untuk memproses data Excel riil ke PostgreSQL & hitung skor:
   ```bash
   python etl_excel_data.py --load-db
   ```
7. Jalankan server FastAPI Backend:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

---

### Langkah 3: Menjalankan Frontend (Next.js UI)

1. Buka jendela terminal baru, lalu masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Install seluruh dependensi Node.js:
   ```bash
   npm install
   ```
3. Jalankan server development Frontend:
   ```bash
   npm run dev
   ```
4. Buka browser dan akses aplikasi di:
   - **Localhost**: **`http://localhost:3000`**
   - **Network IP (Wi-Fi Jaringan Lokal)**: `http://<IP-Komputer-Anda>:3000`

---

## Perintah Operasional Penting

### 1. Pipeline ETL Data Mahasiswa Riil
Memproses file raw Excel ke CSV/Excel bersih dan menyinkronkan langsung ke database:
```bash
python app/etl_excel_data.py --load-db
```

### 2. Melatih Ulang Model Machine Learning (Retraining)
Jika ada data baru di database, pemicu retraining dapat dipanggil melalui API tanpa perlu restart server:
```bash
curl -X POST http://localhost:8000/api/v1/admin/retrain
```

### 3. Mengimpor Data Massal dari SIAKAD / IES
Sistem menyediakan REST API integrasi massal bagi SIAKAD:
```bash
# Endpoint: POST http://localhost:8000/api/v1/mahasiswa/bulk-sync
```
Atau jalankan skrip simulasi bulk sync mahasiswa:
```bash
python test_bulk_sync_scenario.py
```

### 4. Mengakses Analisis Pola Makro
```bash
# Endpoint: GET http://localhost:8000/api/v1/analytics/macro-insights
```

### 5. Restart Container Backend (Docker)
Jika Anda mengubah kode Python di direktori `app/`:
```bash
docker compose restart api_siprido
```

---

## Dokumen Pendukung Lengkap

- [**DOCUMENTATION.md**](DOCUMENTATION.md): Dokumentasi Komprehensif Arsitektur Sistem, ERD Database, Model XGBoost (6 Fitur Riil), 3 Pilar Kebijakan, Rekomendasi Preskriptif, & API Endpoints.
- [**INTEGRATION_GUIDE.md**](INTEGRATION_GUIDE.md): Panduan Integrasi Developer dengan SIAKAD/IES, Macro Insights, Webhook Retraining, MLOps, & Production Deployment.

---

## Struktur Proyek

```
Prediksi DO/
├── app/                              # Backend REST API Server (FastAPI + XGBoost)
│   ├── database.py                   # SQLAlchemy Connection Engine & Pooling
│   ├── etl_excel_data.py             # Pipeline ETL & Data Prep Mahasiswa Smt 2
│   ├── main.py                       # REST API Endpoints, Dynamic Scoring, SHAP, & SIAKAD Sync
│   ├── train_model.py                # Script & Modul Retraining Model XGBoost
│   ├── model_xgboost.joblib          # Trained Binary Model File (6 Fitur)
│   └── requirements.txt              # Dependensi Python Backend
├── data/                             # Dataset Excel Mentah & Hasil Pembersihan ETL
├── frontend/                         # Frontend Web App (Next.js 16 + Tailwind CSS v4)
│   ├── src/app/page.tsx              # Dashboard Eksekutif Utama
│   ├── src/components/               # Komponen UI (KPICards, MacroInsightsCard, StudentTable, StudentDetailModal)
│   └── package.json                  # Dependensi React 19 & Next.js 16
├── .env.example                      # Template Konfigurasi Environment Produksi
├── docker-compose.yml                # Konfigurasi Production Docker Container
├── Dockerfile                        # Container Config untuk FastAPI Backend
├── init_db.sql                       # Script Inisialisasi Database (3 Tabel Utama)
├── test_bulk_sync_scenario.py        # Skrip Simulasi Bulk Sync SIAKAD
├── INTEGRATION_GUIDE.md              # Panduan Integrasi SIAKAD & Enterprise Setup
└── DOCUMENTATION.md                  # Dokumentasi Teknis Komprehensif
```
