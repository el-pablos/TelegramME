# 🚀 SIMPLE Create User - TelegramME Bot

## ✨ FITUR SUPER SIMPLE - HANYA INPUT USERNAME!

Bot TelegramME sekarang memiliki fitur create user yang **sangat mudah**. Anda hanya perlu input **username saja**!

## 🎯 Cara Menggunakan

### 1️⃣ Pilih Menu
Kirim `/start` ke bot, lalu pilih:
- **➕ Create User Admin** (untuk admin)
- **👥 Create User Biasa** (untuk user biasa)

### 2️⃣ Input Username
Ketik username saja, contoh:
```
raff
```

### 3️⃣ Selesai!
Bot akan otomatis generate semua data dan memberikan output lengkap.

## 🔄 Auto Generate System

| Input | Auto Generate |
|-------|---------------|
| `raff` | Email: `raff@cihuy.com` |
| | First Name: `Raff` |
| | Last Name: `Private` |
| | Username: `raff` |
| | Password: `1` |

## 📋 Contoh Lengkap

### Membuat Admin:
**Input:** `raff`

**Output:**
```
✅ Berikut data panel anda:

👤 Raff Private
🔑 raff
🔐 1
🌐 https://private-panel.tams.my.id

👑 Role: Admin
```

### Membuat User Biasa:
**Input:** `john`

**Output:**
```
✅ Berikut data panel anda:

👤 John Private
🔑 john
🔐 1
🌐 https://private-panel.tams.my.id

👤 Role: User Biasa
```

## ✅ Validasi

Bot hanya memvalidasi:
- ✅ Username minimal **3 karakter**
- ✅ Hanya **huruf, angka, underscore (_)**
- ✅ Username **belum digunakan**

## ❌ Error Handling

### "Username terlalu pendek"
- Gunakan minimal 3 karakter
- Contoh: `raff`, `admin`, `user123`

### "Username tidak valid"
- Gunakan hanya: `a-z`, `A-Z`, `0-9`, `_`
- ❌ Salah: `user@123`, `admin-panel`
- ✅ Benar: `user123`, `admin_panel`

### "Username sudah digunakan"
- Coba username lain
- Cek di panel apakah sudah ada

## 🎨 Format Output

Output menggunakan format yang Anda minta:
```
✅ Berikut data panel anda:

👤 {First Name} {Last Name}
🔑 {Username}
🔐 {Password}
🌐 {Panel URL}

{Role Icon} Role: {Role}
```

## 🔧 Technical Details

### Default Values:
- **Domain Email**: `@cihuy.com`
- **Last Name**: `Private`
- **Password**: `1`
- **Panel URL**: Dari environment variable `PANEL_URL`

### Username Processing:
- Input di-lowercase: `RAFF` → `raff`
- First Name di-capitalize: `raff` → `Raff`
- Email auto-generate: `raff` → `raff@cihuy.com`

## 🚀 Keunggulan Fitur Ini

✅ **Super Simple** - Hanya input username
✅ **Auto Generate** - Semua data otomatis
✅ **Consistent** - Format output seragam
✅ **Fast** - Proses cepat tanpa validasi kompleks
✅ **User Friendly** - Mudah digunakan
✅ **Error Handling** - Pesan error yang jelas

## 🎯 Perfect untuk:
- Pembuatan user massal
- Setup cepat panel
- Testing dan development
- User yang tidak mau ribet dengan detail

## 🔄 Cancel Operation
Kapan saja bisa cancel dengan:
- Ketik `/cancel`
- Klik tombol **❌ Cancel**
- Klik **🏠 Menu Utama**

---

**🎉 Fitur ini sudah LIVE dan siap digunakan!**

Test sekarang dengan mengirim `/start` ke bot Anda! 🚀
