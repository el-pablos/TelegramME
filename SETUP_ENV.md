# 🔧 Setup Environment Variables - TelegramME Bot

## 📋 Quick Setup Guide

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Edit Environment File
```bash
nano .env
```

### 3. Fill Required Variables
Isi minimal 5 variabel wajib berikut:

```env
BOT_TOKEN=your_bot_token_here
OWNER_TELEGRAM_ID=your_telegram_id_here
PANEL_URL=https://your-panel.com
APP_API_KEY=ptla_your_app_key_here
CLIENT_API_KEY=ptlc_your_client_key_here
```

## 🔑 Cara Mendapatkan API Keys

### 1. BOT_TOKEN (Telegram Bot Token)
1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Ketik `/newbot`
3. Ikuti instruksi untuk membuat bot baru
4. Copy token yang diberikan (format: `1234567890:ABCdefGHI...`)

### 2. OWNER_TELEGRAM_ID (Your Telegram User ID)
1. Kirim pesan ke [@userinfobot](https://t.me/userinfobot)
2. Bot akan reply dengan informasi akun Anda
3. Copy angka di bagian "Id" (contoh: `123456789`)

### 3. PANEL_URL (Pterodactyl Panel URL)
- URL lengkap panel Pterodactyl Anda
- Contoh: `https://panel.yourdomain.com`
- **JANGAN** tambahkan trailing slash (`/`) di akhir

### 4. APP_API_KEY (Application API Key)
1. Login ke panel Pterodactyl sebagai **admin**
2. Pergi ke **Admin Panel** → **Application API**
3. Klik **"Create New"**
4. Beri nama (contoh: "TelegramBot")
5. Copy API key yang dihasilkan (format: `ptla_...`)

### 5. CLIENT_API_KEY (Client API Key)
1. Login ke panel Pterodactyl sebagai **user biasa**
2. Pergi ke **Account Settings** → **API Credentials**
3. Klik **"Create"**
4. Beri nama (contoh: "TelegramBot")
5. Copy API key yang dihasilkan (format: `ptlc_...`)

## ⚙️ Konfigurasi Opsional

### KONTOL IP Allocation (Fitur Khusus)
```env
KONTOL_IP=0.0.0.0
KONTOL_ALIAS=KONTOL
FORCE_KONTOL_ALLOCATION=true
```

### External Panel Integration
```env
EXTERNAL_PANEL_DOMAIN=https://external-panel.com
EXTERNAL_PANEL_PLTA=ptla_external_app_key
EXTERNAL_PANEL_PLTC=ptlc_external_client_key
```

### Server Creation Defaults
```env
MAIN_PANEL_LOCATION=1
MAIN_PANEL_NEST=6
MAIN_PANEL_EGG=19
```

## 🚀 Test Bot

Setelah mengisi semua variabel wajib:

```bash
node bot.js
```

Jika berhasil, Anda akan melihat:
```
🚀 Bot Telegram Pterodactyl + Rose Features Dimulai!
📱 Bot berjalan dan menunggu pesan...
✅ Bot is ready to receive commands!
```

## 🚨 Troubleshooting

### Error: "Missing required environment variables"
- Pastikan 5 variabel wajib sudah diisi
- Cek tidak ada spasi di awal/akhir nilai
- Pastikan file `.env` ada di root directory

### Error: "401 Unauthorized"
- BOT_TOKEN salah atau tidak valid
- Coba buat bot baru di @BotFather

### Error: "403 Forbidden" (Panel API)
- APP_API_KEY atau CLIENT_API_KEY salah
- Pastikan API key masih aktif di panel
- Cek permissions API key

### Error: "ENOTFOUND" atau "ECONNREFUSED"
- PANEL_URL salah atau tidak bisa diakses
- Cek koneksi internet
- Pastikan panel online

## 🔒 Keamanan

⚠️ **PENTING:**
- Jangan share file `.env` ke siapapun
- API keys memberikan akses penuh ke panel
- Simpan backup `.env` di tempat yang aman
- Jangan commit `.env` ke Git repository

## 📞 Support

Jika masih ada masalah:
- Cek [README.md](README.md) untuk dokumentasi lengkap
- Buat issue di [GitHub](https://github.com/el-pablos/TelegramME/issues)
- Contact: [@ImTamaa](https://t.me/ImTamaa)
