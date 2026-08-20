# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pimpinan Eksekutif Universitas (Rektor, Wakil Rektor I Bidang Akademik, Wakil Rektor II Bidang Keuangan & Administrasi, Wakil Rektor III Bidang Kemahasiswaan), Dekan Fakultas, Ketua Program Studi (Kaprodi), dan Dosen Pembimbing Akademik (DPA).

## Product Purpose

Siprido Executive Information System (EIS) adalah platform intelijen analitik eksekutif berbasis Explainable AI (XGBoost + SHAP) untuk pemantauan dini, diagnosis faktor pemicu, dan perumusan intervensi preskriptif terhadap risiko drop out (DO) mahasiswa semester 2 di lingkungan universitas.

## Positioning

Sistem informasi eksekutif terdepan yang tidak hanya menyajikan angka probabilitas risiko DO, namun membedah kausalitas risiko secara transparan ke dalam 3 pilar strategis universitas (Akademik, Finansial & Wilayah, Kedisiplinan & Keaktifan) serta langsung memetakan rekomendasi aksi ke pemangku wewenang struktural terkait (WR I, WR II, WR III).

## Operating Context

Digunakan pada layar desktop dan display ruang rapat pimpinan eksekutif rektorat/fakultas, evaluasi semesteran, pengambilan keputusan alokasi beasiswa/keringanan UKT, serta sesi konseling bimbingan akademik oleh DPA.

## Capabilities and Constraints

- Menampilkan ringkasan eksekutif distribusi risiko mahasiswa (Rendah, Sedang, Tinggi) dengan rasio persentase.
- Menyediakan Analisis Makro agregat pilar pemicu risiko dan Top 3 faktor pemicu global di tingkat universitas maupun per fakultas.
- Memungkinkan filter cepat berdasarkan Fakultas dan pencarian mahasiswa berdasarkan NIM.
- Menampilkan modal detail komprehensif mahasiswa: profil, nilai IPS S1 & S2, Delta IPS, status cuti, golongan UKT, asal daerah/wilayah, gauge risiko circular SVG, analisis kontribusi SHAP individual (bobot persen & level dampak), serta rekomendasi intervensi bertingkat (Kritis, Penting, Perlu Perhatian) dengan fitur salin catatan ke clipboard untuk bimbingan DPA.
- Menjaga 100% fungsionalitas dan kompatibilitas API backend yang sudah ada.

## Brand Commitments

- Nama Produk: **Siprido | Executive Information System**
- Tone & Rasa: Berwibawa (Authoritative), Presisi Akademik (Academic Rigor), Tenang & Elegan (Executive-Grade Cleanliness), Fokus Keputusan (Decision-Centric).

## Evidence on Hand

- Backend API FastAPI aktif dengan endpoint REST `/api/v1/mahasiswa`, `/api/v1/mahasiswa/{nim}/detail`, `/api/v1/analytics/macro-insights`, `/api/v1/mahasiswa/bulk-sync`, `/api/v1/admin/retrain`, dan `/api/v1/mahasiswa/{nim}/intervensi`.
- Model ML XGBoost + SHAP (`model_xgboost.joblib`) dengan 6 fitur riil mahasiswa Semester 2: `ips_smt1`, `ips_smt2`, `delta_ips`, `golongan_ukt`, `status_cuti`, `kode_wilayah`.
- Skema database PostgreSQL 15 untuk master mahasiswa Semester 2 (`data_mahasiswa_smt2`), prediksi DO (`prediksi_do`), dan riwayat intervensi (`intervensi_mahasiswa`).
- Pipeline ETL terintegrasi (`app/etl_excel_data.py`) untuk data ingestion langsung dari file dataset Excel institusi.

## Product Principles

1. Clarity Over Clutter: Pejabat universitas membutuhkan sinyal keputusan yang tajam dan cepat dipahami dalam hitungan detik.
2. Explainable & Trustworthy AI: Setiap prediksi risiko harus disertai alasan konkret yang dapat dipertanggungjawabkan secara akademik dan administratif.
3. Action-Oriented Insights: Data dan diagnosis harus langsung bermuara pada langkah intervensi kebijakan yang jelas bagi para Wakil Rektor dan DPA.
4. Institutional Elegance: Estetika berkelas khas platform analitik institusi terkemuka dengan tipografi rapi, hierarki visual jelas, dan kontras warna yang nyaman di mata.
