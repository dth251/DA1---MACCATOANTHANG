# 🚀 Hướng Dẫn Triển Khai — maccatoanthang.com

**Phương án: Docker Compose + GitHub Actions CI/CD tự động**

---

## 📐 Kiến Trúc

```
git push → main
      │
      ▼
GitHub Actions
  ├── Build & Test (Gradle)
  ├── Docker build + push → ghcr.io
  └── SSH Deploy → Server
              │
              ▼
    ┌─── VPS Ubuntu 22.04 ──────────────────────┐
    │                                            │
    │  [Nginx :80/:443]  ←── Internet            │
    │       │                                    │
    │       ├── /       → Frontend (HTML tĩnh)   │
    │       └── /api/   → [Backend :8080]        │
    │                          │                 │
    │                   [PostgreSQL :5432]        │
    └────────────────────────────────────────────┘
```

---

## 📂 Các File Đã Tạo

```
maccatoanthang/
├── docker-compose.yml           ← Orchestrate 3 service
├── nginx/
│   ├── nginx.conf               ← Web server + Reverse proxy
│   └── certs/                   ← SSL cert (tạo trên server, KHÔNG commit)
│       ├── fullchain.pem
│       └── privkey.pem
├── .env.example                 ← Mẫu biến môi trường (commit được)
├── .env                         ← Giá trị thật (KHÔNG commit — đã có trong .gitignore)
└── .github/
    └── workflows/
        └── deploy.yml           ← CI/CD pipeline
```

---

## GIAI ĐOẠN 1 — Chuẩn Bị Server (Làm 1 lần)

### 1.1 Mua VPS

| Thông số | Giá trị |
|---|---|
| Gói | **Cheap 4** (2 vCPU / 4GB RAM / 30GB SSD) |
| OS | **Ubuntu 22.04 LTS** (64-bit) |
| Port mở | 22, 80, 443 |

### 1.2 Trỏ DNS

Vào trang quản lý DNS của nhà đăng ký domain, thêm:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `<IP_SERVER>` |
| `A` | `www` | `<IP_SERVER>` |

> Đợi 5–30 phút để DNS lan truyền. Kiểm tra tại [dnschecker.org](https://dnschecker.org)

### 1.3 SSH vào Server và Cài Docker

```bash
ssh root@<IP_SERVER>

# Cài Docker Engine
curl -fsSL https://get.docker.com | sh

# Cài Docker Compose plugin
apt install docker-compose-plugin -y

# Tạo thư mục dự án
mkdir -p /opt/maccatoanthang/nginx/certs

# Kiểm tra
docker --version
docker compose version
```

### 1.4 Cấp SSL miễn phí (Let's Encrypt)

> **Điều kiện:** DNS đã trỏ thành công về server.

```bash
# Cài Certbot
apt install certbot -y

# Cấp chứng chỉ (dừng port 80 nếu có service đang chạy)
certbot certonly --standalone \
  -d maccatoanthang.com \
  -d www.maccatoanthang.com \
  --email <your@email.com> \
  --agree-tos \
  --non-interactive

# Copy cert vào thư mục dự án
cp /etc/letsencrypt/live/maccatoanthang.com/fullchain.pem \
   /opt/maccatoanthang/nginx/certs/fullchain.pem

cp /etc/letsencrypt/live/maccatoanthang.com/privkey.pem \
   /opt/maccatoanthang/nginx/certs/privkey.pem
```

**Tự động gia hạn cert mỗi tuần (thêm vào crontab):**

```bash
crontab -e
```

Thêm dòng:
```
0 3 * * 0 certbot renew --quiet && \
  cp /etc/letsencrypt/live/maccatoanthang.com/fullchain.pem /opt/maccatoanthang/nginx/certs/fullchain.pem && \
  cp /etc/letsencrypt/live/maccatoanthang.com/privkey.pem /opt/maccatoanthang/nginx/certs/privkey.pem && \
  docker exec macca_nginx nginx -s reload
```

### 1.5 Tạo file `.env` trên Server

```bash
nano /opt/maccatoanthang/.env
```

Nội dung (dựa theo `.env.example`, điền giá trị thật):

```dotenv
DB_PASSWORD=<mật_khẩu_mạnh_ít_nhất_20_ký_tự>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<mật_khẩu_admin_mạnh>
JWT_SECRET=<chạy: openssl rand -hex 32>
PUBLIC_ORIGIN=https://maccatoanthang.com,https://www.maccatoanthang.com
GITHUB_REPOSITORY=<github_username>/<ten_repo>
SEED_ENABLED=true
```

Tạo JWT Secret:
```bash
openssl rand -hex 32
```

Phân quyền file:
```bash
chmod 600 /opt/maccatoanthang/.env
```

### 1.6 Tạo SSH Key cho GitHub Actions

```bash
# Tạo key pair riêng cho CI/CD
ssh-keygen -t ed25519 -C "github-actions" -f /root/.ssh/github_actions -N ""

# Thêm public key vào authorized_keys
cat /root/.ssh/github_actions.pub >> /root/.ssh/authorized_keys

# In private key ra để copy vào GitHub Secrets
cat /root/.ssh/github_actions
```

### 1.7 Thêm GitHub Secrets

Vào **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Giá trị |
|---|---|
| `SERVER_IP` | IP của VPS |
| `SERVER_USER` | `root` |
| `SSH_PRIVATE_KEY` | Toàn bộ nội dung file `/root/.ssh/github_actions` |

---

## GIAI ĐOẠN 2 — Deploy Lần Đầu

```bash
# Trên máy local — commit và push lên GitHub
git add .
git commit -m "chore: add production deployment files"
git push origin main
```

GitHub Actions sẽ tự động:
1. Build JAR và chạy tests
2. Build Docker image → push lên `ghcr.io`
3. SSH vào server → pull image → khởi động 3 service
4. Health check `https://maccatoanthang.com/api/products`

**Theo dõi tiến trình:** GitHub Repo → tab **Actions**

### Kiểm tra sau deploy

```bash
# SSH vào server
docker compose -f /opt/maccatoanthang/docker-compose.yml ps

# Xem logs backend
docker compose -f /opt/maccatoanthang/docker-compose.yml logs --tail=50 backend

# Test trực tiếp
curl https://maccatoanthang.com/api/products
```

### Tắt seed data (sau khi đã có data thật)

```bash
nano /opt/maccatoanthang/.env
# Đổi: SEED_ENABLED=false

# Áp dụng
cd /opt/maccatoanthang
docker compose up -d --no-deps --force-recreate backend
```

---

## GIAI ĐOẠN 3 — Vận Hành Tự Động

Từ lần 2 trở đi, chỉ cần:

```bash
git push origin main
# → GitHub Actions tự động build & deploy trong ~3–5 phút
```

---

## 🔧 Xử Lý Sự Cố

| Triệu chứng | Nguyên nhân | Giải pháp |
|---|---|---|
| Backend không start | DB chưa ready | `docker compose logs db` |
| 502 Bad Gateway | Backend đang khởi động | Đợi 60s, xem `logs backend` |
| CORS error | `PUBLIC_ORIGIN` sai | Cập nhật `.env` → restart backend |
| SSL lỗi | Cert chưa copy vào `nginx/certs/` | Chạy lại bước 1.4 |
| Health check fail | Backend crash | `docker compose logs --tail=100 backend` |

### Lệnh debug thường dùng

```bash
cd /opt/maccatoanthang

# Xem trạng thái toàn bộ
docker compose ps

# Logs realtime
docker compose logs -f backend

# Restart một service
docker compose restart backend

# Xem dung lượng disk
docker system df

# Dọn dẹp image cũ
docker image prune -f
```

---

## 💾 Backup Database

```bash
# Backup thủ công
docker exec macca_db pg_dump -U macca_user macca_toanthang \
  | gzip > /opt/backup/macca-$(date +%Y%m%d-%H%M).sql.gz

# Thêm crontab backup tự động mỗi ngày 2:00 AM
mkdir -p /opt/backup
crontab -e
# Thêm dòng:
0 2 * * * docker exec macca_db pg_dump -U macca_user macca_toanthang | gzip > /opt/backup/macca-$(date +\%Y\%m\%d).sql.gz
```

---

## 📋 Checklist Tổng

```
GIAI ĐOẠN 1 — Chuẩn bị (trên Server & GitHub)
───────────────────────────────────────────────
□ Mua VPS Cheap 4, Ubuntu 22.04 LTS, mở port 80/443/22
□ Trỏ DNS: maccatoanthang.com → IP server
□ SSH vào server, cài Docker + Docker Compose
□ Cấp SSL Let's Encrypt
□ Tạo /opt/maccatoanthang/.env với giá trị thật
□ Tạo SSH key pair cho CI/CD
□ Thêm 3 GitHub Secrets: SERVER_IP, SERVER_USER, SSH_PRIVATE_KEY

GIAI ĐOẠN 2 — Deploy lần đầu
───────────────────────────────
□ git push origin main
□ Theo dõi GitHub Actions tab
□ Kiểm tra https://maccatoanthang.com
□ Đổi SEED_ENABLED=false sau khi ổn định

GIAI ĐOẠN 3 — Vận hành
────────────────────────
□ Mỗi lần cập nhật: git push origin main → tự động deploy
□ Backup DB định kỳ
□ Cert SSL tự gia hạn mỗi tuần qua crontab
```
