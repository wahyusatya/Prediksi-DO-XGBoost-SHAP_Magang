"""
Siprido EIS - Database Connection Module
==========================================
Setup koneksi SQLAlchemy ke PostgreSQL dengan Connection Pooling.
"""

import os
from sqlalchemy import create_engine

# ============================================================
# Konfigurasi Database
# ============================================================
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "rootpassword")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_NAME = os.getenv("DB_NAME", "db_siprido_eis")

DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ============================================================
# Engine PostgreSQL dengan Production Connection Pooling
# ============================================================
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Memastikan koneksi aktif sebelum digunakan
    pool_size=10,             # Jumlah koneksi konstan di pool
    max_overflow=20,          # Koneksi tambahan maksimum saat traffic memuncak
    pool_recycle=1800,        # Daur ulang koneksi tiap 30 menit
    pool_timeout=30,          # Batas waktu tunggu koneksi dari pool (detik)
)
