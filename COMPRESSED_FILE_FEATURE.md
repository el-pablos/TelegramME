# 📦 Auto Decompress Feature - TelegramME Bot

## 🎉 **FITUR BARU BERHASIL DITAMBAHKAN!**

Bot TelegramME sekarang memiliki fitur **auto deteksi compressed file** dengan opsi **decompress otomatis**!

## 🔍 **Auto Detection**

Bot akan otomatis mendeteksi file compressed saat upload dan memberikan opsi:

### ✅ **Supported Formats:**
- **`.zip`** - ZIP Archive
- **`.jar`** - Java Archive (JAR)
- **`.war`** - Web Archive (WAR)
- **`.ear`** - Enterprise Archive (EAR)
- **`.tar`** - TAR Archive
- **`.tar.gz`** - Gzipped TAR Archive
- **`.tgz`** - Gzipped TAR Archive
- **`.gz`** - Gzip Compressed File

### ⚠️ **Detected but Not Supported:**
- **`.tar.bz2`** - Bzipped TAR Archive
- **`.tbz2`** - Bzipped TAR Archive
- **`.bz2`** - Bzip2 Compressed File
- **`.7z`** - 7-Zip Archive
- **`.rar`** - RAR Archive

## 🚀 **Cara Kerja**

### 1️⃣ **Upload File Compressed**
Saat Anda upload file compressed ke **📁 Upload File to User Servers**, bot akan:

1. **Deteksi otomatis** format file
2. **Tampilkan informasi** file compressed
3. **Berikan pilihan:**
   - ✅ **Ya, Decompress** - Extract dan upload semua file
   - 📤 **Tidak, Upload Apa Adanya** - Upload file compressed
   - ❌ **Batal** - Batalkan upload

### 2️⃣ **Opsi Decompress**

#### ✅ **Ya, Decompress:**
- Bot akan **download** file compressed
- **Extract** semua file di dalamnya
- **Upload** setiap file individual ke semua server user
- **Report** detail hasil extraction dan upload

#### 📤 **Tidak, Upload Apa Adanya:**
- Bot akan **upload** file compressed tanpa extract
- File tetap dalam format compressed di server
- User bisa extract manual di server

## 📋 **Contoh Penggunaan**

### **Scenario 1: Upload ZIP File**
```
📦 Compressed File Detected

📄 File: website.zip
📦 Type: ZIP Archive
📊 Size: 2.5 MB

🤔 Sekalian decompress?

✅ Ya - Extract dan upload semua file di dalamnya
📤 Tidak - Upload file compressed apa adanya

⚠️ Note: Decompression akan extract semua file ke server
```

**Pilih ✅ Ya:**
```
✅ Decompression Successful

📦 Archive: website.zip
📄 Extracted: 25 files
📊 Target: 3 servers

⏳ Uploading extracted files...

📦 Decompress & Upload Complete

📄 Original: website.zip
📊 Extracted: 25 files
🎯 Target: 3 servers

📈 Results:
✅ Success: 75 uploads
❌ Failed: 0 uploads

📋 File Details:
• index.html (5.2KB): 3✅ 0❌
• style.css (2.1KB): 3✅ 0❌
• script.js (8.5KB): 3✅ 0❌
• ... dan 22 file lainnya
```

### **Scenario 2: Upload JAR File**
```
📦 Compressed File Detected

📄 File: minecraft-plugin.jar
📦 Type: Java Archive (JAR)
📊 Size: 1.2 MB

🤔 Sekalian decompress?
```

**Pilih 📤 Tidak:**
```
📤 Upload Compressed File Complete

📄 File: minecraft-plugin.jar
📊 Size: 1.2 MB
🎯 Target: 5 servers

📈 Results:
✅ Success: 5 servers
❌ Failed: 0 servers
```

## 🔧 **Technical Details**

### **Dependencies Added:**
```json
{
  "yauzl": "^2.10.0",
  "adm-zip": "^0.5.10", 
  "tar-stream": "^3.1.6"
}
```

### **Detection Logic:**
```javascript
// Deteksi compound extensions dulu
if (fileName.endsWith('.tar.gz')) return 'tar.gz'
if (fileName.endsWith('.tar.bz2')) return 'tar.bz2'

// Lalu single extensions
const ext = path.extname(fileName)
if (COMPRESSED_EXTENSIONS[ext]) return ext
```

### **Decompression Process:**
1. **Download** file dari Telegram API
2. **Detect** compression type
3. **Extract** menggunakan library yang sesuai:
   - ZIP/JAR/WAR/EAR → `adm-zip`
   - TAR → `tar-stream`
   - TAR.GZ/TGZ → `zlib.gunzip` + `tar-stream`
   - GZ → `zlib.gunzip`
4. **Upload** setiap extracted file via Pterodactyl API

## 🎯 **Use Cases**

### ✅ **Perfect untuk:**
- **Website deployment** - Upload ZIP berisi HTML/CSS/JS
- **Plugin installation** - JAR files untuk Minecraft/Bukkit
- **Source code** - TAR.GZ dari GitHub releases
- **Configuration bundles** - Multiple config files dalam ZIP
- **Backup restoration** - Extract backup archives

### 📦 **Contoh File Types:**
- `website.zip` → Extract ke HTML, CSS, JS files
- `plugin.jar` → Upload as-is atau extract classes
- `backup.tar.gz` → Extract semua backup files
- `configs.zip` → Extract individual config files
- `source.tgz` → Extract source code files

## 🚨 **Limitations**

### **File Size:**
- Max **20MB** per compressed file (Telegram limit)
- Extracted files unlimited (dalam reason)

### **Supported Extraction:**
- Hanya format yang listed di **Supported Formats**
- Format lain akan detected tapi tidak bisa di-extract

### **Upload Method:**
- Extracted files di-upload ke **root directory** server
- Tidak preserve folder structure (semua files di root)

## 📊 **Status Bot**

```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ TelegramME         │ fork     │ 36   │ online    │ 0%       │ 21.5mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

## 🎉 **Ready to Use!**

Fitur **Auto Decompress** sudah **LIVE** dan siap digunakan!

**Test sekarang:**
1. Kirim `/start` ke bot
2. Pilih **📁 File Management** → **📤 Upload File to User Servers**
3. Pilih user target
4. Upload file ZIP/JAR/TAR.GZ
5. Pilih opsi decompress yang diinginkan!

**Bot akan otomatis detect dan berikan opsi decompress! 🚀**
