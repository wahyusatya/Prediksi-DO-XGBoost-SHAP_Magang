"""
Siprido EIS - Skrip Pengujian Bulk Sync (Sinkronisasi Data Massal)
===================================================================
Skrip ini digunakan untuk mensimulasikan integrasi sistem SIAKAD universitas
yang mengirimkan batch data mahasiswa semester 2 secara massal ke REST API Siprido.

Format Output: Dirancang rapi dan informatif untuk dokumentasi/tangkapan layar laporan.
"""

import json
import random
import time
import urllib.request
from datetime import datetime

API_URL = "http://localhost:8000/api/v1/mahasiswa/bulk-sync"

# Data nama realistis mahasiswa
FIRST_NAMES = [
    "I Wayan", "I Made", "I Nyoman", "I Ketut", "I Putu", "I Kadek", "I Komang", "I Gede",
    "Ni Wayan", "Ni Made", "Ni Nyoman", "Ni Ketut", "Ni Putu", "Ni Kadek", "Ni Komang", "Ni Luh",
    "I Gusti Ngurah", "Anak Agung", "Dewa Gede", "Tjokorda", "Agus", "Budi", "Rizky", "Dimas",
    "Siti", "Nur", "Dewi", "Ayu", "Putri", "Lestari", "Wahyu", "Satya", "Aditya", "Bayu",
    "Fajar", "Ilham", "Mahendra", "Pradnya", "Chandra", "Indra", "Angga", "Yoga"
]
LAST_NAMES = [
    "Pratama", "Suardika", "Wibawa", "Kusuma", "Arimbawa", "Suryawan", "Widiana", "Mahardika",
    "Santoso", "Wijaya", "Putra", "Hidayat", "Saputra", "Utama", "Pradnyana", "Dharma",
    "Gunawan", "Setiawan", "Permana", "Wiguna", "Wardana", "Yasa", "Sudira", "Antara",
    "Ariawan", "Sukadana", "Mahendra", "Wirasana", "Bhadrika", "Kusumawardhana"
]

# Pemetaan wilayah & asal daerah
DAERAH_KODE_1 = ["Singaraja", "Banyuasri", "Penarukan", "Kampung Baru", "Kampung Anyar", "Kaliuntu", "Banyuning", "Baktiseraga"]
DAERAH_KODE_2 = ["Seririt", "Sukasada", "Gerokgak", "Sawan", "Busungbiu", "Banjar", "Kubutambahan", "Tejakula"]
DAERAH_KODE_3 = ["Denpasar", "Badung", "Tabanan", "Gianyar", "Karangasem", "Jembrana", "Klungkung", "Bangli", "Mataram", "Surabaya", "Banyuwangi"]

PRODI_LIST = [
    "FT/Teknik Informatika",
    "FT/Sistem Informasi",
    "FT/Pendidikan Teknik Informatika",
    "FMIPA/Ilmu Komputer",
    "FMIPA/Pendidikan Matematika",
    "FEB/Manajemen",
    "FEB/Akuntansi",
    "FBS/Pendidikan Bahasa Inggris",
    "FHIS/Ilmu Hukum",
]

def generate_dummy_students(n=120, start_nim=2415052001):
    """Men-generate data dummy mahasiswa realistis untuk pengujian batch sync (6 fitur riil Semester 2)."""
    random.seed(2026)  # Seed 2026 untuk dataset pengujian baru yang konsisten
    students = []

    for i in range(n):
        nim = str(start_nim + i)
        prodi = random.choice(PRODI_LIST)

        # Distribusi profil mahasiswa universitas:
        rand_profile = random.random()

        if rand_profile < 0.65:
            # 65% Profil Mahasiswa Aman (Risiko Rendah: IP Tinggi, UKT Wajar, Tidak Cuti)
            ips_1 = round(random.uniform(3.10, 3.90), 2)
            ips_2 = round(min(4.00, ips_1 + random.uniform(-0.10, 0.25)), 2)
            ukt = random.choice([1, 2, 3, 4])
            cuti = 0
            wilayah = random.choices([1, 2, 3], weights=[0.55, 0.30, 0.15])[0]
        elif rand_profile < 0.85:
            # 20% Profil Mahasiswa Waspada (Risiko Sedang: Penurunan Nilai / UKT Menengah-Tinggi)
            ips_1 = round(random.uniform(2.70, 3.25), 2)
            ips_2 = round(max(1.80, ips_1 - random.uniform(0.15, 0.45)), 2)
            ukt = random.choice([3, 4, 5, 6])
            cuti = random.choice([0, 0, 1])
            wilayah = random.choices([1, 2, 3], weights=[0.20, 0.50, 0.30])[0]
        else:
            # 15% Profil Mahasiswa Terancam DO (Risiko Tinggi: IP Drop, Cuti, UKT Tinggi/Luar Daerah)
            ips_1 = round(random.uniform(1.70, 2.65), 2)
            ips_2 = round(max(1.00, ips_1 - random.uniform(0.30, 0.85)), 2)
            ukt = random.choice([4, 5, 6, 7])
            cuti = random.choice([0, 1, 1, 2])
            wilayah = random.choices([1, 2, 3], weights=[0.10, 0.30, 0.60])[0]

        if wilayah == 1:
            asal = f"Kec. {random.choice(DAERAH_KODE_1)}, Kab. Buleleng"
        elif wilayah == 2:
            asal = f"Kec. {random.choice(DAERAH_KODE_2)}, Kab. Buleleng"
        else:
            asal = f"Kab. {random.choice(DAERAH_KODE_3)}, Prov. Bali"

        students.append({
            "nim": nim,
            "fakultas_prodi": prodi,
            "smt": 2,
            "ips_smt1": ips_1,
            "ips_smt2": ips_2,
            "golongan_ukt": ukt,
            "status_cuti": cuti,
            "kode_wilayah": wilayah,
            "asal_daerah": asal,
        })

    return students

def run_simulation():
    waktu_eksekusi = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("=" * 80)
    print(" SIPRIDO EIS - SIMULASI INTEGRASI BULK SYNC SIAKAD (6 FITUR SEMESTER 2)")
    print(f" Waktu Eksekusi : {waktu_eksekusi}")
    print(f" Target Endpoint: {API_URL}")
    print("=" * 80)

    # 1. Generate Dataset Dummy
    print("\n[TAHAP 1] Pembuatan Dataset Mahasiswa Semester 2 (6 Fitur Riil)...")
    total_data = 120
    students = generate_dummy_students(total_data, start_nim=2415052001)
    print(f"[OK] Berhasil men-generate {len(students)} data mahasiswa.")
    print("\n[Preview 3 Sampel Data Teratas]:")
    print(f" {'NIM':<12} | {'Prodi':<28} | {'IPS 1':<6} | {'IPS 2':<6} | {'UKT':<4} | {'Cuti':<5} | {'Wilayah':<8}")
    print("-" * 85)
    for s in students[:3]:
        print(f" {s['nim']:<12} | {s['fakultas_prodi']:<28} | {s['ips_smt1']:<6.2f} | {s['ips_smt2']:<6.2f} | UKT {s['golongan_ukt']:<1} | {s['status_cuti']:<5} | Kode {s['kode_wilayah']}")

    # 2. Pengiriman Batch ke REST API
    payload = {"data": students}
    json_data = json.dumps(payload).encode("utf-8")

    print(f"\n[TAHAP 2] Mengirim HTTP POST Payload ({len(json_data):,} bytes) ke API...")
    start_time = time.time()

    req = urllib.request.Request(
        API_URL,
        data=json_data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            elapsed_ms = (time.time() - start_time) * 1000
            result = json.loads(res_body)

        print(f"[OK] Response API Diterima Status {response.status} dalam {elapsed_ms:.2f} ms")
        print(f"     Status Operasi: {result.get('status')}")
        print(f"     Total Data Sinkronisasi: {result.get('total_synced')} mahasiswa")

        # 3. Agregasi Hasil Prediksi & Klasifikasi Risiko
        synced_data = result.get("data", [])
        tinggi = sum(1 for d in synced_data if d.get("status_risiko") == "Tinggi")
        sedang = sum(1 for d in synced_data if d.get("status_risiko") == "Sedang")
        rendah = sum(1 for d in synced_data if d.get("status_risiko") == "Rendah")

        print("\n[TAHAP 3] Hasil Klasifikasi Risiko Otomatis (Machine Learning Model):")
        print(f" - Risiko TINGGI : {tinggi:>3} mahasiswa ({(tinggi/len(synced_data))*100:.1f}%)")
        print(f" - Risiko SEDANG : {sedang:>3} mahasiswa ({(sedang/len(synced_data))*100:.1f}%)")
        print(f" - Risiko RENDAH : {rendah:>3} mahasiswa ({(rendah/len(synced_data))*100:.1f}%)")

        print("\n[TAHAP 4] Sampel Top 5 Mahasiswa dengan Risiko Tertinggi (Early Warning):")
        sorted_data = sorted(synced_data, key=lambda x: x.get("skor_prediksi", 0), reverse=True)
        print(f" {'No':<3} | {'NIM':<12} | {'Skor DO':<8} | {'Status':<8} | {'IPS 1->2':<12} | {'UKT':<5} | {'Cuti'}")
        print("-" * 75)
        for rank, item in enumerate(sorted_data[:5], 1):
            mhs_info = next((s for s in students if s["nim"] == item["nim"]), None)
            ips_info = f"{mhs_info['ips_smt1']} -> {mhs_info['ips_smt2']}" if mhs_info else "-"
            ukt_info = f"UKT {mhs_info['golongan_ukt']}" if mhs_info else "-"
            cuti_info = f"{mhs_info['status_cuti']} Smt" if mhs_info else "-"
            print(f" {rank:<3} | {item['nim']:<12} | {item['skor_prediksi']:>5}%   | {item['status_risiko']:<8} | {ips_info:<12} | {ukt_info:<5} | {cuti_info}")

        print("\n" + "=" * 80)
        print(" [SUKSES] PROSES BULK SYNC SELESAI. Seluruh data tersimpan di PostgreSQL.")
        print("=" * 80)

    except urllib.error.URLError as e:
        print(f"[ERROR] Gagal menghubungi backend API ({API_URL}). Pastikan server FastAPI/Docker sudah berjalan.")
        print(f"Detail error: {e}")
    except Exception as e:
        print(f"[ERROR] Terjadi kesalahan: {e}")

if __name__ == "__main__":
    run_simulation()
