# AttendEase - Sistem Manajemen Absensi & Penggajian

AttendEase adalah aplikasi web modern untuk mengelola kehadiran karyawan, sanksi, bonus, tabungan, dan penggajian secara otomatis.

## Fitur Utama
- **Dasbor Real-time**: Statistik kehadiran harian dan grafik jam kerja.
- **Manajemen Karyawan**: Data lengkap termasuk rekening bank/e-wallet.
- **Sistem Absensi**: Pencatatan masuk, pulang, keterlambatan, dan ketidakhadiran.
- **Penggajian Otomatis**: Perhitungan gaji bersih berdasarkan absensi, bonus, dan sanksi.
- **Slip Gaji Digital**: Tautan slip gaji rahasia yang bisa dikirim ke karyawan.
- **Tabungan Karyawan**: Fitur simpan sisa gaji ke saldo tabungan dan tarik tunai.

## Panduan Persiapan Produksi

### 1. Konfigurasi Firebase Console
Sebelum meluncurkan, pastikan hal berikut sudah diatur di [Firebase Console](https://console.firebase.google.com/):
- **Authentication**: Aktifkan metode login "Email/Password".
- **Firestore Database**: Pastikan database sudah dibuat dalam mode produksi. Aturan keamanan (rules) akan diterapkan otomatis saat deployment.

### 2. Membuat Akun Admin Pertama
Karena aplikasi tidak memiliki fitur pendaftaran publik:
1. Buka Firebase Console > Authentication > Users.
2. Klik "Add user".
3. Masukkan email dan password admin Anda. Gunakan kredensial ini untuk masuk ke aplikasi.

### 3. Cara Deployment ke Firebase App Hosting
1. Pastikan kode Anda sudah di-push ke repositori GitHub.
2. Di Firebase Console, cari menu **App Hosting**.
3. Klik "Get started" dan hubungkan akun GitHub Anda.
4. Pilih repositori proyek ini.
5. Firebase akan mendeteksi konfigurasi Next.js dan mulai melakukan proses *build* serta deployment secara otomatis.

### 4. Pengaturan Aplikasi
Setelah berhasil login pertama kali:
1. Buka menu **Pengaturan** di aplikasi.
2. Atur "Batas Waktu Keterlambatan" (contoh: 07:35).
3. Atur "Jumlah Potongan Keterlambatan" dan "Potongan Alpa".
4. Tambahkan data **Hari Libur** untuk menghindari kesalahan pencatatan absensi.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.