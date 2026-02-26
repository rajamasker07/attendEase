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

### Galat: "We are waiting for permissions to propagate" atau "Something went wrong creating your rollout"

Jika Anda melihat pesan ini di Firebase Console, sistem sedang menunggu izin akses Google Cloud sinkron. Ikuti langkah ini:

1. **Paket Blaze**: Pastikan proyek Anda sudah di-upgrade ke paket **Blaze (Pay-as-you-go)**. App Hosting memerlukan paket ini.
2. **Cek Izin di Google Cloud Console**:
   - Buka [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam).
   - Cari akun layanan yang namanya mengandung `app-hosting` atau `firebase-app-hosting`.
   - Pastikan akun tersebut memiliki peran:
     - `App Hosting Admin`
     - `Cloud Build Editor`
     - `Artifact Registry Writer`
3. **Tunggu & Coba Lagi**: Izin Google Cloud kadang memakan waktu 5-10 menit untuk aktif sepenuhnya. Jika masih gagal, hapus koneksi App Hosting tersebut dan buat ulang (backend baru) setelah izin dipastikan benar.
4. **Konfigurasi Firebase**: Pastikan file `src/firebase/config.ts` berisi data milik proyek Anda yang aktif, bukan ID proyek default.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.
