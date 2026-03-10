# 🚀 Deployment Guide - VPS + Portainer

## Overview
Deploy Buzzer Detector dengan 1 Docker Stack yang berisi:
- **Next.js Web App** (Port 3000)
- **Python Analysis Service** (Port 8000)

## 📁 File Deployment

| File | Keterangan |
|------|------------|
| `Dockerfile` | Build image Next.js |
| `docker-compose.yml` | Stack definition untuk Portainer |
| `.env.deploy.example` | Template environment variables |

## 🚀 Cara Deploy di Portainer

### 1. Push Code ke Git
```bash
git add .
git commit -m "Add deployment config"
git push origin main
```

### 2. Buat Stack di Portainer
1. Login ke Portainer
2. Pilih **Stacks** → **Add Stack**
3. Pilih metode: **Git Repository** (Recommended) atau **Web Editor**

#### Opsi A: Git Repository (Auto Deploy)
- **Name**: `buzzer-detector`
- **Repository URL**: `https://github.com/username/repo.git`
- **Repository Reference**: `refs/heads/main`
- **Compose Path**: `docker-compose.yml`
- **Automatic Updates**: ✅ Enable (opsional)

#### Opsi B: Web Editor
- Copy isi `docker-compose.yml`
- Paste ke web editor

### 3. Set Environment Variables
Di bagian **Environment Variables**, isi:

```env
N8N_AI_WEBHOOK_URL=https://n8n.technokh.com/webhook/ai-review
ANTHROPIC_API_KEY=sk-ant-api03-your-key
```

### 4. Deploy Stack
Klik **Deploy the stack** dan tunggu build selesai.

## 🌐 Akses Aplikasi

| Service | URL | Keterangan |
|---------|-----|------------|
| Web App | `http://your-vps-ip:3000` | Frontend Buzzer Detector |
| Python API | `http://your-vps-ip:8000` | Direct access ke Python service |
| Health Check | `http://your-vps-ip:8000/health` | Status Python service |

## 🔒 Setup dengan Domain + SSL (Nginx Proxy Manager)

Jika pakai Nginx Proxy Manager:

1. **Proxy Host untuk Web (Port 3000)**
   - Domain: `buzzer.yourdomain.com`
   - Forward Hostname: `buzzer-web`
   - Forward Port: `3000`
   - Enable SSL

2. **Proxy Host untuk API (Port 8000) - Opsional**
   - Domain: `api-buzzer.yourdomain.com`
   - Forward Hostname: `buzzer-analyzer`
   - Forward Port: `8000`
   - Enable SSL

## 🔄 Update Deployment

### Auto Update (Git Repository)
Jika pakai Git Repository dengan Auto Update enable, push ke branch akan otomatis redeploy.

### Manual Update
1. Di Portainer → Stacks → `buzzer-detector`
2. Klik **Pull and redeploy**
3. Klik **Update**

## 🛠️ Troubleshooting

### Cek Log Service
```bash
# Log Next.js
docker logs buzzer-web

# Log Python
docker logs buzzer-analyzer
```

### Restart Stack
```bash
docker-compose restart
```

### Cek Health Status
```bash
# Python health
curl http://localhost:8000/health

# Test analyze endpoint
curl -X POST http://localhost:8000/analyze/sample
```

## 📋 Pre-Deployment Checklist

- [ ] Next.js build sukses (`npm run build`)
- [ ] Python Dockerfile valid
- [ ] Environment variables diisi lengkap
- [ ] Port 3000 dan 8000 tidak bentrok
- [ ] n8n webhook URLs valid dan accessible
