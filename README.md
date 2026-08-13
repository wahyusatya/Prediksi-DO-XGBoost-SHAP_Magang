# Siprido EIS — Sistem Informasi Eksekutif Prediksi Drop Out Mahasiswa
> **Executive Information System (EIS)** berbasis Machine Learning (XGBoost + SHAP) dan FastAPI + Next.js untuk memprediksi risiko Drop Out (DO) mahasiswa semester 2 serta memberikan analisis faktor pemicu utama.

---

## 📌 Prasyarat Perangkat (Prerequisites)

Sebelum melakukan setup pada **perangkat/laptop baru**, pastikan perangkat Anda sudah terinstall:

1. **Git**: Untuk mengkloning repositori.
2. **Docker & Docker Desktop**: *(Direkomendasikan)* Untuk menjalankan Database PostgreSQL & Backend API secara otomatis.
3. **Node.js (v18+) & npm**: Untuk menjalankan Frontend Next.js.
4. **Python (v3.10+)**: *(Jika ingin menjalankan Backend secara lokal tanpa Docker)*.

---

## 🚀 Panduan Setup & Cara Menjalankan di Perangkat Baru

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
3. Jalankan script migrasi database (hanya sekali saat setup perangkat baru):
   ```bash
   docker exec -i db_siprido psql -U root -d db_siprido_eis < migrate_kehadiran.sql
   docker exec -i db_siprido psql -U root -d db_siprido_eis < migrate_intervensi.sql
   ```
4. **Verifikasi Backend**: Buka browser ke **`http://localhost:8000/docs`** untuk melihat Swagger API Interactive Documentation.

---

#### Opsi B: Tanpa Docker (Menjalankan Python & PostgreSQL Lokal)

1. Install **PostgreSQL 15** lokal. Buat database bernama `db_siprido_eis` dengan kredensial:
   - User: `root` | Password: `rootpassword` | Port: `5433`
2. Impor struktur tabel & data initial ke PostgreSQL:
   ```bash
   psql -U root -d db_siprido_eis -f init_db.sql
   psql -U root -d db_siprido_eis -f migrate_kehadiran.sql
   psql -U root -d db_siprido_eis -f migrate_intervensi.sql
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
6. Jalankan server FastAPI Backend:
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

## 🛠️ Perintah Operasional Penting

### 1. Melatih Ulang Model Machine Learning (Retraining)
Jika ada pembaruan algoritma atau data baru di database, pemicu retraining dapat dipanggil melalui API tanpa perlu restart server:
```bash
curl -X POST http://localhost:8000/api/v1/admin/retrain
```

### 2. Mengimpor Data Massal dari SIAKAD / IES
Sistem menyediakan REST API integrasi massal bagi SIAKAD:
```bash
# Endpoint: POST http://localhost:8000/api/v1/mahasiswa/bulk-sync
```

### 3. Restart Container Backend (Docker)
Jika Anda mengubah kode Python di direktori `app/`:
```bash
docker compose restart api_siprido
```

---

## 📚 Dokumen Pendukung Lengkap

- 📖 [**DOCUMENTATION.md**](DOCUMENTATION.md): Dokumentasi Komprehensif Arsitektur Sistem, ERD Database, Model XGBoost, SHAP, & API Endpoints.
- 🔌 [**INTEGRATION_GUIDE.md**](INTEGRATION_GUIDE.md): Panduan Integrasi Developer dengan SIAKAD/IES, Webhook Retraining, MLOps, & Production Deployment.

---

## 📂 Struktur Proyek

```
Prediksi DO/
├── app/                        # Backend REST API Server (FastAPI + XGBoost)
│   ├── database.py             # SQLAlchemy Connection Engine
│   ├── main.py                 # REST API Endpoints, Dynamic Scoring, SHAP, & SIAKAD Sync
│   ├── train_model.py          # Script & Modul Retraining Model XGBoost
│   ├── model_xgboost.joblib    # Trained Binary Model File
│   └── requirements.txt        # Dependensi Python Backend
├── frontend/                   # Frontend Web App (Next.js 15 + Tailwind CSS)
│   ├── src/app/page.tsx        # Dashboard Eksekutif Utama
│   ├── src/components/         # Komponen UI (KPICards, StudentTable, StudentDetailModal)
│   └── package.json            # Dependensi React & Next.js
├── .env.example                # Template Konfigurasi Environment Produksi
├── docker-compose.yml          # Konfigurasi Production Docker Container
├── Dockerfile                  # Container Config untuk FastAPI Backend
├── init_db.sql                 # Script Inisialisasi Database awal
├── migrate_intervensi.sql      # Migrasi Tabel Intervensi DPA
├── INTEGRATION_GUIDE.md        # Panduan Integrasi SIAKAD & Enterprise Setup
└── DOCUMENTATION.md            # Dokumentasi Teknis Komprehensif
```
