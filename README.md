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

### 3. Cara Deployment ke Firebase App Hosting (Wajib GitHub)
Firebase App Hosting **mensyaratkan** koneksi ke GitHub untuk berfungsi:
1. Pastikan kode Anda sudah di-push ke repositori GitHub.
2. Di Firebase Console, cari menu **App Hosting**.
3. Klik "Get started" dan hubungkan akun GitHub Anda.
4. Pilih repositori proyek ini.
5. Firebase akan mendeteksi konfigurasi Next.js dan mulai melakukan proses *build* serta deployment secara otomatis.

## Pemecahan Masalah (Troubleshooting)

### Masalah: Tombol "Connect to GitHub" Tidak Bisa Diklik
Jika tombol tersebut berwarna abu-abu atau tidak merespons:
1. **Wajib Paket Blaze**: Firebase App Hosting tidak tersedia di paket Spark (Gratis). Anda harus meng-upgrade proyek ke paket **Blaze**. Anda tetap akan mendapatkan kuota gratis yang besar, namun kartu kredit/debit diperlukan sebagai syarat layanan cloud.
2. **Cek Izin Akun**: Pastikan akun Google Anda memiliki peran **Owner** pada proyek tersebut.
3. **Refresh & Incognito**: Coba buka Firebase Console di jendela penyamaran (Incognito) untuk memastikan tidak ada cache atau extension browser yang menghalangi.

### Galat: "We are waiting for permissions to propagate" atau "Something went wrong creating your rollout"
Jika Anda melihat pesan ini setelah berhasil menyambungkan GitHub:
1. **Tunggu 10 Menit**: Sistem Google Cloud memerlukan waktu untuk menyinkronkan izin akses akun layanan baru.
2. **Cek Izin di Google Cloud Console**:
   - Buka [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam).
   - Cari akun layanan yang namanya mengandung `app-hosting`.
   - Pastikan akun tersebut memiliki peran: `App Hosting Admin`, `Cloud Build Editor`, dan `Artifact Registry Writer`.
3. **Langkah Hapus & Ulangi (Sangat Disarankan)**:
   - Jika proses "Rollout" gagal terus, hapus konfigurasi Backend App Hosting tersebut di Firebase Console.
   - Tunggu 2 menit.
   - Buat ulang Backend App Hosting dari awal dan hubungkan kembali ke GitHub. Seringkali pembuatan ulang memicu perbaikan izin yang tersangkut.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.
