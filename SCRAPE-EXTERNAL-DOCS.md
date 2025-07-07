# 🔍 Scrape External Panel Creds - Dokumentasi

## 📋 Deskripsi
Fitur **Scrape External Panel Creds** memungkinkan Anda untuk mengambil semua file `creds.json` dari panel Pterodactyl eksternal dan menyimpannya ke folder `/output-external` di server lokal.

## 🎯 Tujuan
- Backup creds dari panel eksternal
- Migrasi data creds antar panel
- Analisis dan audit file creds
- Penyimpanan terorganisir dengan nama file yang aman

## ⚙️ Konfigurasi Panel Eksternal

### Data Panel yang Digunakan:
```javascript
const EXTERNAL_PANEL = {
    domain: 'https://panel-one.ndikafath.com',
    plta: 'ptla_a7BlBCHL3092q9UtkoIldTYc7M93DgO32CCwa8drj8p',
    pltc: 'ptlc_pga8ppETdjzglhaKwUITFOOtnLXNshZlp7QSArYXALj',
    loc: '1',
    nests: '5',
    eggs: '15'
}
```

### Parameter:
- **Domain**: `https://panel-one.ndikafath.com`
- **PLTA**: `ptla_a7BlBCHL3092q9UtkoIldTYc7M93DgO32CCwa8drj8p`
- **PLTC**: `ptlc_pga8ppETdjzglhaKwUITFOOtnLXNshZlp7QSArYXALj`
- **Location ID**: `1`
- **Nests ID**: `5`
- **Eggs ID**: `15`

## 🚀 Cara Menggunakan

### 1. Melalui Bot Telegram:
1. Buka bot Telegram
2. Pilih menu **"🔍 Scrape Creds External Panel"**
3. Bot akan menampilkan informasi panel dan jumlah server
4. Klik **"✅ Ya, Mulai Scraping"** untuk memulai
5. Bot akan memproses semua server dan menyimpan creds ke `/output-external`

### 2. Proses Scraping:
- Bot mengambil daftar semua server dari panel eksternal
- Mencari file `creds.json` di berbagai lokasi:
  - `/var/lib/pterodactyl/volumes/{uuid}/session/creds.json`
  - `/var/lib/pterodactyl/volumes/{uuid}/creds.json`
  - `/var/lib/pterodactyl/volumes/{uuid}/session/plugins/creds.json`
  - File `.json` lainnya di folder session
- Membersihkan dan memvalidasi JSON
- Menyimpan dengan nama file yang aman

## 📁 Output

### Lokasi Penyimpanan:
```
/output-external/
├── ServerName1.json
├── ServerName2.json
├── Server_Special_Name_3.json
└── ...
```

### Format Nama File:
- Nama server diubah menjadi format aman (mengganti karakter khusus dengan `_`)
- Ekstensi `.json` ditambahkan
- Contoh: `"Server@Special#Name"` → `"Server_Special_Name.json"`

### Isi File:
```json
{
  "session": "session-data-here",
  "user_id": "123456789",
  "phone": "+1234567890",
  "created": "2025-07-05T23:48:15.336Z"
}
```

## 🔧 Fitur Teknis

### 1. Pembersihan JSON:
- Menghapus nomor baris seperti `"1{...}"` di awal file
- Memvalidasi format JSON sebelum menyimpan
- Menangani berbagai format file JSON

### 2. Penanganan Error:
- Skip server yang tidak memiliki creds
- Lanjutkan proses meski ada error di beberapa server
- Laporan detail hasil scraping

### 3. Keamanan:
- Cek panel blacklist sebelum scraping
- Validasi akses owner bot
- Rate limiting untuk mencegah spam API

## 📊 Laporan Hasil

### Format Laporan:
```
✅ Scraping Creds Selesai

🌐 Panel: https://panel-one.ndikafath.com
📊 Ringkasan:
📤 Total Scraped: 15
⏭️ Dilewati: 3
❌ Error: 1
📁 Output Folder: /output-external
⏰ Selesai: 6/7/2025, 06.48.15

📋 File yang Berhasil Discrape:
1. ServerName1 → ServerName1.json
2. ServerName2 → ServerName2.json
...

🎯 Semua creds berhasil discrape dari panel eksternal!
```

## ⚠️ Catatan Penting

### 1. Persyaratan:
- Bot harus memiliki akses ke volume Pterodactyl
- API key eksternal harus valid dan aktif
- Panel eksternal tidak boleh dalam blacklist

### 2. Batasan:
- Hanya mengambil file yang sudah ada
- Tidak membuat atau memodifikasi file di panel eksternal
- Memerlukan akses file system ke volume Pterodactyl

### 3. Keamanan:
- File disimpan lokal di server bot
- Tidak ada transmisi data ke pihak ketiga
- API key disimpan aman dalam konfigurasi

## 🔄 Integrasi dengan Fitur Lain

### 1. Setor Sender:
- File hasil scraping bisa digunakan untuk setor sender
- Format JSON sudah kompatibel
- Nama file sudah aman untuk upload

### 2. Copy External Creds:
- Bisa dikombinasikan dengan copy creds untuk migrasi
- Backup sebelum copy untuk keamanan
- Verifikasi hasil copy dengan scraping

### 3. Panel Management:
- Monitoring panel eksternal
- Audit file creds secara berkala
- Backup otomatis sebelum operasi besar

## 🎯 Keunggulan

1. **Otomatis**: Proses semua server sekaligus
2. **Aman**: Validasi JSON dan nama file aman
3. **Terorganisir**: Penyimpanan rapi di folder khusus
4. **Informatif**: Laporan detail hasil scraping
5. **Fleksibel**: Mendukung berbagai lokasi file creds
6. **Robust**: Penanganan error yang baik

## 🚀 Status
✅ **SIAP DIGUNAKAN** - Fitur telah ditest dan berfungsi dengan baik!

Fitur scrape external creds sudah terintegrasi penuh dengan bot dan siap untuk digunakan untuk backup dan migrasi data creds dari panel eksternal.
