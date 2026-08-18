"""
Siprido EIS - Simulasi Bulk Sync 120 Mahasiswa
================================================
Skrip ini mensimulasikan integrasi sistem universitas (SIAKAD)
mengirimkan 120 data mahasiswa semester 2 secara massal ke API Siprido.
"""

import json
import random
import time
import urllib.request

API_URL = "http://localhost:8000/api/v1/mahasiswa/bulk-sync"

# Daftar nama dan daerah realistis
FIRST_NAMES = [
    "I Wayan", "I Made", "I Nyoman", "I Ketut", "I Putu", "I Kadek", "I Komang", "I Gede",
    "Ni Wayan", "Ni Made", "Ni Nyoman", "Ni Ketut", "Ni Putu", "Ni Kadek", "Ni Komang", "Ni Luh",
    "I Gusti Ngurah", "Anak Agung", "Dewa Gede", "Tjokorda", "Agus", "Budi", "Rizky", "Dimas",
    "Siti", "Nur", "Dewi", "Ayu", "Putri", "Lestari", "Wahyu", "Satya", "Aditya", "Bayu"
]
LAST_NAMES = [
    "Pratama", "Suardika", "Wibawa", "Kusuma", "Arimbawa", "Suryawan", "Widiana", "Mahardika",
    "Santoso", "Wijaya", "Putra", "Hidayat", "Saputra", "Utama", "Pradnyana", "Dharma",
    "Gunawan", "Setiawan", "Permana", "Wiguna", "Wardana", "Yasa", "Sudira", "Antara"
]
DAERAH_KODE_1 = ["Singaraja", "Banyuasri", "Penarukan", "Kampung Baru", "Kampung Anyar", "Kaliuntu", "Banyuning"]
DAERAH_KODE_2 = ["Seririt", "Sukasada", "Gerokgak", "Sawan", "Busungbiu", "Banjar", "Kubutambahan", "Tejakula"]
DAERAH_KODE_3 = ["Denpasar", "Tabanan", "Gianyar", "Karangasem", "Jembrana", "Klungkung", "Bangli", "Mataram (Lombok)", "Surabaya (Jatim)", "Banyuwangi"]

PRODI_LIST = [
    "FT/Pendidikan Teknik Informatika",
    "FT/Sistem Informasi",
    "FT/Ilmu Komputer",
    "FMIPA/Pendidikan Matematika",
    "FE/Manajemen",
    "FBS/Pendidikan Bahasa Inggris",
]

def generate_dummy_students(n=120):
    random.seed(42)  # Seed tetap agar hasil deterministik dan bisa direproduksi
    students = []

    for i in range(1, n + 1):
        nim = f"241505{1000 + i}"
        nama = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        prodi = random.choice(PRODI_LIST)

        # Skenario distribusi profil mahasiswa realistis di universitas:
        rand_profile = random.random()

        if rand_profile < 0.65:
            # 65% Profil Mahasiswa Aman (Risiko Rendah)
            ips_1 = round(random.uniform(3.10, 3.90), 2)
            ips_2 = round(min(4.00, ips_1 + random.uniform(-0.15, 0.30)), 2)
            ukt = random.choice([1, 2, 3, 4])
            cuti = 0
            wilayah = random.choices([1, 2, 3], weights=[0.5, 0.35, 0.15])[0]
            kehadiran = round(random.uniform(88.0, 100.0), 1)
            cekal = 0
        elif rand_profile < 0.85:
            # 20% Profil Mahasiswa Waspada (Risiko Sedang)
            ips_1 = round(random.uniform(2.70, 3.25), 2)
            ips_2 = round(max(1.80, ips_1 - random.uniform(0.15, 0.50)), 2)
            ukt = random.choice([3, 4, 5, 6])
            cuti = random.choice([0, 0, 1])
            wilayah = random.choices([1, 2, 3], weights=[0.2, 0.5, 0.3])[0]
            kehadiran = round(random.uniform(76.0, 86.0), 1)
            cekal = random.choice([0, 1])
        else:
            # 15% Profil Mahasiswa Terancam DO (Risiko Tinggi)
            ips_1 = round(random.uniform(1.80, 2.70), 2)
            ips_2 = round(max(1.00, ips_1 - random.uniform(0.30, 0.90)), 2)
            ukt = random.choice([4, 5, 6, 7])
            cuti = random.choice([0, 1, 1, 2])
            wilayah = random.choices([1, 2, 3], weights=[0.1, 0.3, 0.6])[0]
            kehadiran = round(random.uniform(45.0, 74.0), 1)
            cekal = random.randint(1, 4)

        if wilayah == 1:
            asal = random.choice(DAERAH_KODE_1)
        elif wilayah == 2:
            asal = random.choice(DAERAH_KODE_2)
        else:
            asal = random.choice(DAERAH_KODE_3)

        students.append({
            "nim": nim,
            "nama": nama,
            "fakultas_prodi": prodi,
            "smt": 2,
            "ips_smt1": ips_1,
            "ips_smt2": ips_2,
            "golongan_ukt": ukt,
            "status_cuti": cuti,
            "kode_wilayah": wilayah,
            "asal_daerah": asal,
            "persen_kehadiran_smt2": kehadiran,
            "mk_cekal_uas_smt2": cekal,
        })

    return students

def run_simulation():
    print("=" * 70)
    print("[SIMULASI] SIPRIDO EIS - BULK SYNC INTEGRASI UNIVERSITAS")
    print("=" * 70)

    # 1. Generate Dummy Data
    print("\n[Step 1] Men-generate 120 data mahasiswa dummy...")
    students = generate_dummy_students(120)
    print(f"[OK] Berhasil membuat {len(students)} data mahasiswa.")
    print("   Contoh 3 data pertama:")
    for s in students[:3]:
        print(f"   - NIM: {s['nim']} | Nama: {s['nama']:<22} | IPS1: {s['ips_smt1']} | IPS2: {s['ips_smt2']} | UKT: {s['golongan_ukt']} | Kehadiran: {s['persen_kehadiran_smt2']}% | Asal: {s['asal_daerah']}")

    # 2. Kirim ke Endpoint Bulk Sync
    payload = {"data": students}
    json_data = json.dumps(payload).encode("utf-8")

    print(f"\n[Step 2] Mengirim HTTP POST ke {API_URL}...")
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

        print(f"[OK] Response API Diterima dalam {elapsed_ms:.2f} ms!")
        print(f"   Status      : {result.get('status')}")
        print(f"   Total Synced: {result.get('total_synced')} mahasiswa")

        # 3. Analisis Hasil Prediksi
        synced_data = result.get("data", [])
        tinggi = sum(1 for d in synced_data if d["status_risiko"] == "Tinggi")
        sedang = sum(1 for d in synced_data if d["status_risiko"] == "Sedang")
        rendah = sum(1 for d in synced_data if d["status_risiko"] == "Rendah")

        print("\n[Step 3] Hasil Klasifikasi Risiko Prediksi DO:")
        print(f"   [RISIKO TINGGI] : {tinggi:>3} mahasiswa ({tinggi/len(synced_data)*100:.1f}%)")
        print(f"   [RISIKO SEDANG] : {sedang:>3} mahasiswa ({sedang/len(synced_data)*100:.1f}%)")
        print(f"   [RISIKO RENDAH] : {rendah:>3} mahasiswa ({rendah/len(synced_data)*100:.1f}%)")

        print("\n[Step 4] Contoh Hasil Prediksi (Top 5 Mahasiswa Paling Berisiko):")
        sorted_data = sorted(synced_data, key=lambda x: x["skor_prediksi"], reverse=True)
        for rank, item in enumerate(sorted_data[:5], 1):
            mhs_info = next(s for s in students if s["nim"] == item["nim"])
            print(f"   {rank}. NIM: {item['nim']} | {mhs_info['nama']:<22} | Skor: {item['skor_prediksi']:>2}% | Status: {item['status_risiko']} | IPS 1->2: {mhs_info['ips_smt1']}->{mhs_info['ips_smt2']} | Cekal: {mhs_info['mk_cekal_uas_smt2']} MK")

        print("\n" + "=" * 70)
        print("[SUKSES] SIMULASI SELESAI! Seluruh data sudah tersimpan & terprediksi.")
        print("=" * 70)

    except Exception as e:
        print(f"[ERROR] saat memanggil API: {e}")

if __name__ == "__main__":
    run_simulation()
