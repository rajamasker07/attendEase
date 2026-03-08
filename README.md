# AttendEase - Sistem Manajemen Absensi & Penggajian

AttendEase adalah aplikasi web modern untuk mengelola kehadiran karyawan, sanksi, bonus, tabungan, dan penggajian secara otomatis.

## Fitur Utama
- **Dasbor Real-time**: Statistik kehadiran harian dan grafik jam kerja.
- **Manajemen Karyawan**: Data lengkap termasuk rekening bank/e-wallet.
- **Sistem Absensi**: Pencatatan masuk, pulang, keterlambatan, dan ketidakhadiran.
- **Penggajian Otomatis**: Perhitungan gaji bersih berdasarkan absensi, sanksi, dan bonus.
- **Hutang & Kasbon**: Pencatatan pinjaman karyawan dengan limit otomatis dan pemotongan saat gajian.
- **Tabungan Karyawan**: Fitur simpan sisa gaji ke saldo tabungan dan tarik tunai.

## Panduan Persiapan Produksi

### 1. Konfigurasi Firebase Console
Sebelum meluncurkan, pastikan hal berikut sudah diatur di [Firebase Console](https://console.firebase.google.com/):
- **Authentication**: Aktifkan metode login "Email/Password".
- **Firestore Database**: Pastikan database sudah dibuat dalam mode produksi.
- **Firebase Project Config**: Buka Project Settings, salin objek `firebaseConfig`, dan perbarui file `src/firebase/config.ts` di kode Anda.

### 2. Penggunaan Docker (Portabilitas)
Anda dapat menjalankan aplikasi ini di server mana pun menggunakan Docker:
```bash
docker build -t attendease-app .
docker run -p 3000:3000 attendease-app
```

### 3. Otomatisasi CI/CD
File `.github/workflows/verify.yml` telah disertakan. Setiap kali Anda melakukan `push` ke branch `main`, GitHub akan otomatis mengecek kesalahan pengetikan (*Type Check*) dan memastikan aplikasi dapat di-*build* dengan sukses sebelum dideploy.

### 4. Cara Deployment ke Firebase App Hosting (Wajib GitHub)
Firebase App Hosting **mensyaratkan** koneksi ke GitHub untuk berfungsi:
1. Pastikan kode Anda sudah di-push ke repositori GitHub.
2. Di Firebase Console, cari menu **App Hosting**.
3. Klik "Get started" dan hubungkan akun GitHub Anda.
4. Pilih repositori proyek ini.
5. Firebase akan mendeteksi konfigurasi Next.js dan mulai melakukan proses *build* serta deployment secara otomatis.

## Pemecahan Masalah (Troubleshooting)

### Masalah: Tombol "Connect to GitHub" Tidak Bisa Diklik
Jika tombol tersebut berwarna abu-abu atau tidak merespons:
1. **Wajib Paket Blaze**: Firebase App Hosting tidak tersedia di paket Spark (Gratis). Anda harus meng-upgrade proyek ke paket **Blaze**. 
2. **Cek Izin Akun**: Pastikan akun Google Anda memiliki peran **Owner** pada proyek tersebut.

### Galat: "We are waiting for permissions to propagate"
1. **Tunggu 10 Menit**: Sistem Google Cloud memerlukan waktu untuk menyinkronkan izin akses.
2. **Hapus & Ulangi**: Jika gagal terus, hapus konfigurasi Backend App Hosting di Firebase Console, tunggu 2 menit, lalu buat ulang dari awal. Seringkali ini akan memperbaiki izin yang tersangkut.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.
