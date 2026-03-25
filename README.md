># AttendEase - Sistem Manajemen Absensi & Penggajian

AttendEase adalah aplikasi web modern untuk mengelola kehadiran karyawan, sanksi, bonus, tabungan, dan penggajian secara otomatis.

## Fitur Utama
- **Dasbor Real-time**: Statistik kehadiran harian dan grafik jam kerja.
- **Manajemen Karyawan**: Data lengkap termasuk limit pinjaman khusus.
- **Sistem Absensi**: Pencatatan masuk, pulang, keterlambatan, dan ketidakhadiran.
- **Hutang & Kasbon**: Pelunasan otomatis lewat gaji (Payroll) atau pelunasan manual tunai.
- **Tabungan Karyawan**: Simpan sisa gaji ke saldo tabungan dan tarik tunai.
- **Laporan & Cetak**: Laporan kehadiran per periode dan slip gaji digital.

## Persiapan Lokal (Development)

1. **Instalasi Dependensi**:
   ```bash
   npm install
   ```

2. **Konfigurasi Environment**:
   Salin `.env.example` menjadi `.env.local` dan isi dengan konfigurasi Firebase Anda.

3. **Jalankan Aplikasi**:
   ```bash
   npm run dev
   ```

## Penggunaan Docker (Portabilitas)

Aplikasi ini sudah siap dijalankan di dalam kontainer:

1. **Build Image**:
   ```bash
   docker build -t attendease-app .
   ```

2. **Jalankan Kontainer**:
   ```bash
   docker run -p 3000:3000 attendease-app
   ```

## Deployment ke Firebase App Hosting (Rekomendasi)

Firebase App Hosting mensyaratkan koneksi ke GitHub:
1. Push kode Anda ke repositori GitHub.
2. Di Firebase Console, masuk ke menu **App Hosting**.
3. Hubungkan repositori GitHub tersebut.
4. Pilih branch `main` dan deploy.

### Tips Pemecahan Masalah App Hosting:
- Jika tombol "Connect to GitHub" tidak bisa diklik, pastikan proyek Anda sudah di-upgrade ke paket **Blaze**.
- Jika terjadi error perizinan, hapus konfigurasi backend di Firebase Console, tunggu 2 menit, lalu buat ulang.

## Keamanan Data
Pastikan Anda memperbarui `firestore.rules` di Firebase Console sesuai dengan file `firestore.rules` yang ada di dalam proyek ini untuk melindungi data sensitif karyawan.

---
Dikembangkan dengan Next.js, Tailwind CSS, dan Firebase.
