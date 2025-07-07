# 📤 Setor Sender via API - FITUR DIUPDATE!

## 🎯 Deskripsi
Fitur **Setor Sender** telah diupdate untuk menggunakan **Pterodactyl API** (bukan akses file lokal) seperti fitur scraping external creds. Sekarang semua operasi dilakukan via API untuk konsistensi dan reliability yang lebih baik.

## ✨ Perubahan yang Diterapkan

### 🔄 **Dari File Lokal ke API**:
- **❌ Sebelum**: Akses file lokal `/var/lib/pterodactyl/volumes/{uuid}/session/creds.json`
- **✅ Sekarang**: API calls ke `/api/client/servers/{uuid}/files/list` dan `/api/client/servers/{uuid}/files/write`

### 🌐 **API Endpoints Used**:
```
GET /api/client/servers/{uuid}/files/list?directory=%2Fsession
POST /api/client/servers/{uuid}/files/write
```

### 🔧 **Detection Method**:
- **❌ Sebelum**: `fs.existsSync()` untuk cek folder session dan creds.json
- **✅ Sekarang**: API calls untuk list files dan detect keberadaan creds.json

### 📤 **Upload Method**:
- **❌ Sebelum**: `fs.writeFileSync()` untuk tulis file lokal
- **✅ Sekarang**: API POST request dengan payload JSON

## 🚀 Cara Menggunakan

### 1. **Mulai Setor Sender**:
- Pilih menu **"📤 Setor Sender (Upload JSON Files)"**
- Bot akan menampilkan:
```
📤 Setor Sender - Upload JSON Files

📊 Status Panel:
🏠 Panel Utama: https://memek.tams.my.id
📈 Total Server: 22
✅ Sudah ada sender: ~5 (estimasi)
📁 Tanpa folder session: ~10 (estimasi)
🆓 Siap terima sender: ~7 (estimasi)
🌐 Method: Pterodactyl API

🎯 Target Upload:
• Upload dilakukan via API (bukan file lokal)
• Hanya server dengan folder session yang siap
• Maksimal 7 sender bisa diupload
• Server tanpa folder session akan dilewati

📋 Cara Penggunaan:
1️⃣ Kirim file JSON sender (nama bebas: sender1.json, config.json, dll)
2️⃣ Bot akan auto-rename jadi creds.json
3️⃣ Auto-distribute ke server yang siap terima sender via API
4️⃣ Klik "✅ Selesai Upload" untuk selesai

⚠️ Catatan:
• Hanya file .json yang diterima
• File akan di-validate sebagai JSON
• Upload via API, tidak perlu akses file lokal

📤 Mulai upload file JSON sender Anda!
```

### 2. **Upload File JSON**:
- Kirim file JSON dengan nama bebas (sender1.json, config.json, dll)
- Bot akan:
  1. Download file dari Telegram
  2. Validate JSON format
  3. Cari server yang available via API
  4. Upload ke server via API
  5. Konfirmasi berhasil

### 3. **Konfirmasi Upload**:
```
✅ Sender Berhasil Terkoneksi

📄 Sender: sender1.json
🎯 Target Server: ServerName
📁 Disimpan sebagai: /session/creds.json
🌐 Method: Pterodactyl API
📊 Progress: 1 sender connected
🆓 Server Kosong Tersisa: 6

📤 Lanjutkan upload sender berikutnya atau klik Selesai
```

### 4. **Selesai Upload**:
- Klik **"✅ Selesai Upload"**
- Bot akan menampilkan ringkasan dan opsi restart server

## 🔧 Fitur Teknis

### 🔍 **Smart Server Detection**:
1. **API Check**: List files di `/session` directory via API
2. **Session Validation**: Pastikan folder session exists
3. **Creds Detection**: Cek apakah `creds.json` sudah ada
4. **Availability**: Hanya server dengan session tapi tanpa creds yang dipilih

### 📤 **API Upload Process**:
```javascript
// Upload payload structure
{
  "root": "/session",
  "files": [
    {
      "name": "creds.json",
      "content": "{\"session\":\"data\",\"user_id\":\"123\"}"
    }
  ]
}
```

### ⏱️ **Rate Limiting**:
- Delay 1 detik antar server check
- Delay 2 detik antar API request
- Mencegah spam API panel

### 🛡️ **Error Handling**:
- **Session Not Found**: Skip server dan cari yang lain
- **API Error**: Retry dengan server berikutnya
- **Upload Failed**: Error message dengan detail
- **No Available Servers**: Informasi lengkap dengan saran

## 📊 Estimasi dan Sampling

### 🔢 **Sampling Method**:
- Check 10 server pertama untuk preview
- Hitung persentase available/with creds/without session
- Estimasi total berdasarkan sample

### 📈 **Display Format**:
```
✅ Sudah ada sender: ~5 (estimasi)
📁 Tanpa folder session: ~10 (estimasi)
🆓 Siap terima sender: ~7 (estimasi)
```

## 🎯 Keunggulan API Method

### 🌐 **Remote Access**:
- Tidak perlu akses file system lokal
- Bekerja dari mana saja via internet
- Tidak tergantung volume mounting

### 🔄 **Consistency**:
- Sama dengan scraping external creds
- Unified API approach
- Consistent error handling

### 🛡️ **Reliability**:
- Official Pterodactyl API
- Better error messages
- More robust than file access

### 📊 **Monitoring**:
- Real-time progress via Telegram
- Detailed upload confirmations
- Clear error reporting

## 🔧 Configuration

### 🔑 **Required API Keys**:
```javascript
const PANEL_URL = 'https://memek.tams.my.id';
const APP_API_KEY = 'ptla_your_app_key_here';
const CLIENT_API_KEY = 'ptlc_your_client_key_here';
```

### 📋 **Permissions Needed**:
- **App API**: Read servers list
- **Client API**: List files, write files

## 🚀 Status

### ✅ **FULLY OPERATIONAL**
- **Server Detection**: ✅ Via API, bukan file lokal
- **File Upload**: ✅ Via API, bukan file system
- **Error Handling**: ✅ Robust API error management
- **Progress Tracking**: ✅ Real-time via Telegram
- **Estimation**: ✅ Smart sampling and calculation
- **Rate Limiting**: ✅ Prevent API spam

## 🎉 Ready to Use!

Fitur **Setor Sender via API** sudah:
- ✅ Terintegrasi penuh dengan bot
- ✅ Menggunakan API approach yang konsisten
- ✅ Diupdate dari file lokal ke API
- ✅ Siap untuk production use

**Workflow lengkap**: Detect via API → Upload via API → Confirm → Restart! 🌟

### 📋 Benefits:
1. **Consistent**: Sama dengan scraping external creds
2. **Reliable**: Official API, bukan file access
3. **Remote**: Tidak perlu akses file system
4. **Robust**: Better error handling
5. **Scalable**: Rate limiting dan sampling
6. **User-Friendly**: Clear progress dan error messages

**Fitur ini mengatasi masalah akses file lokal dengan menggunakan API resmi Pterodactyl!** 🎯
