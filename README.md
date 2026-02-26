# AttendEase - Sistem Manajemen Absensi & Penggajian

AttendEase adalah aplikasi web modern untuk mengelola kehadiran karyawan, sanksi, bonus, tabungan, dan penggajian secara otomatis.

## Fitur Utama
- **Dasbor Real-time**: Statistik kehadiran harian dan grafik jam kerja.
- **Manajemen Karyawan**: Data lengkap termasuk rekening bank/e-wallet.
- **Sistem Absensi**: Pencatatan masuk, pulang, keterlambatan, dan ketidakhadiran.
- **Penggajian Otomatis**: Perhitungan gaji bersih berdasarkan absensi, sanksi, dan bonus.
- **Tabungan Karyawan**: Fitur simpan sisa gaji ke saldo tabungan dan tarik tunai.

## Panduan Persiapan Produksi

### 1. Konfigurasi Firebase Console
Sebelum meluncurkan, pastikan hal berikut sudah diatur di [Firebase Console](https://console.firebase.google.com/):
- **Authentication**: Aktifkan metode login "Email/Password".
- **Firestore Database**: Pastikan database sudah dibuat dalam mode produksi.
- **Firebase Project Config**: Buka Project Settings, salin objek `firebaseConfig`, dan perbarui file `src/firebase/config.ts` di kode Anda dengan data tersebut.

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

## Pemecahan Masalah (Troubleshooting)

Jika Anda menemui galat **"Something went wrong creating your App Hosting rollout"**:

1. **Paket Blaze**: Pastikan proyek Firebase Anda sudah di-upgrade ke paket **Blaze (Pay-as-you-go)**. Meskipun biayanya hampir selalu Rp 0 untuk penggunaan kecil, App Hosting memerlukan paket ini untuk bisa berjalan.
2. **Izin Service Account**: Terkadang service account App Hosting belum memiliki izin yang cukup. Pastikan akun tersebut memiliki role `App Hosting Admin` dan `Cloud Build Editor` di Google Cloud Console.
3. **Konfigurasi Firebase**: Pastikan file `src/firebase/config.ts` sudah berisi API Key dan Project ID milik proyek Firebase Anda yang sebenarnya, bukan ID proyek Studio.
4. **Coba Lagi**: Terkadang layanan backend Firebase sedang sibuk. Tunggu 5-10 menit lalu klik "Retry" atau buat Rollout baru.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.
