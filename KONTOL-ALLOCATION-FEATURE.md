# 🎯 KONTOL IP ALLOCATION FEATURE

## 📋 **OVERVIEW**

Fitur baru yang memaksa semua server yang dibuat menggunakan IP allocation khusus `0.0.0.0` dengan alias "KONTOL" alih-alih menggunakan `0.0.0.0` atau auto-assignment.

## ✅ **FITUR YANG DITAMBAHKAN**

### 🔧 **1. Konfigurasi Environment**
```bash
# File: .env
KONTOL_IP=0.0.0.0
KONTOL_ALIAS=KONTOL
FORCE_KONTOL_ALLOCATION=true
```

### 🎯 **2. Fungsi Allocation Management**
- `getKontolAllocation()` - Mencari allocation dengan IP KONTOL yang tersedia
- `createKontolAllocation()` - Membuat allocation baru dengan IP KONTOL
- `ensureKontolAllocation()` - Memastikan allocation KONTOL tersedia

### 🚀 **3. Server Creation Enhancement**
- **Custom Server Creation**: Menggunakan KONTOL allocation jika tersedia
- **Default Server Creation**: Menggunakan KONTOL allocation jika tersedia
- **Fallback Mechanism**: Auto-assignment jika KONTOL allocation tidak tersedia

## 🎯 **CARA KERJA**

### **1. Startup Configuration**
```
🎯 KONTOL Allocation Configuration:
   • KONTOL IP: 0.0.0.0
   • Force KONTOL Allocation: ✅ ENABLED
   • Allocation Alias: KONTOL
   • 🎯 All new servers will attempt to use 0.0.0.0 allocation
   • 🔄 Fallback to auto-assignment if KONTOL allocation unavailable
```

### **2. Server Creation Process**
```javascript
// 1. Check if KONTOL allocation should be used
if (FORCE_KONTOL_ALLOCATION) {
    console.log(`🎯 KONTOL mode enabled - ensuring 0.0.0.0 allocation...`);
    kontolAllocationId = await PteroAPI.ensureKontolAllocation(MAIN_PANEL_LOCATION);
}

// 2. Add KONTOL allocation to server data
if (kontolAllocationId) {
    serverData.allocation = {
        default: kontolAllocationId
    };
    console.log(`🎯 Server will use KONTOL allocation: ID ${kontolAllocationId} (0.0.0.0)`);
} else {
    console.log(`🔄 Server will use auto-assigned allocation`);
}
```

### **3. Allocation Search Logic**
```javascript
// Find allocation with KONTOL IP
const kontolAllocation = allocations.find(alloc => 
    alloc.attributes.ip === KONTOL_IP && 
    !alloc.attributes.assigned
);
```

## 📊 **LOG OUTPUT EXAMPLES**

### **✅ Success Case:**
```
🔍 Searching for KONTOL allocation with IP: 0.0.0.0
✅ Found available KONTOL allocation: { id: 5, ip: '0.0.0.0', port: 25565, alias: 'KONTOL' }
🎯 KONTOL allocation ready: ID 5 (0.0.0.0)
🎯 Server will use KONTOL allocation: ID 5 (0.0.0.0)
```

### **⚠️ Fallback Case:**
```
🔍 Searching for KONTOL allocation with IP: 0.0.0.0
❌ No available KONTOL allocation found with IP 0.0.0.0
🔧 No KONTOL allocation found, attempting to create...
❌ Failed to ensure KONTOL allocation availability
⚠️ KONTOL allocation not available, falling back to auto-assignment
🔄 Server will use auto-assigned allocation
```

## 🔧 **KONFIGURASI**

### **Enable/Disable Feature:**
```bash
# Enable KONTOL allocation
FORCE_KONTOL_ALLOCATION=true

# Disable KONTOL allocation (use auto-assignment)
FORCE_KONTOL_ALLOCATION=false
```

### **Custom IP Configuration:**
```bash
# Change IP target
KONTOL_IP=192.168.1.100

# Change alias name
KONTOL_ALIAS=CUSTOM_IP
```

## 🎯 **KEUNTUNGAN**

1. **Konsistensi IP**: Semua server menggunakan IP yang sama
2. **Kontrol Penuh**: Admin dapat mengatur IP allocation secara terpusat
3. **Fallback Safety**: Jika KONTOL allocation tidak tersedia, tetap bisa membuat server
4. **Logging Lengkap**: Semua proses allocation tercatat dengan jelas
5. **Konfigurasi Fleksibel**: Dapat diubah melalui environment variables

## ⚠️ **CATATAN PENTING**

1. **Allocation Availability**: Pastikan IP `0.0.0.0` tersedia di node Pterodactyl
2. **Port Management**: System akan auto-assign port yang tersedia
3. **Node Configuration**: IP harus dikonfigurasi di node yang sesuai dengan `MAIN_PANEL_LOCATION`
4. **Fallback Behavior**: Jika KONTOL allocation tidak tersedia, server tetap akan dibuat dengan auto-assignment

## 🚀 **STATUS**

✅ **IMPLEMENTED FEATURES:**
- Environment configuration
- Allocation search and creation
- Server creation integration
- Logging and monitoring
- Fallback mechanism

🎯 **RESULT:**
- Semua server baru akan menggunakan IP `0.0.0.0` jika tersedia
- Bukan lagi menggunakan `0.0.0.0` atau auto-assignment default
- Alias "KONTOL" untuk identifikasi allocation
