# 📁 Hướng dẫn Migration - Cấu trúc Thư mục Mới

## 🎯 Tổng quan

Dự án đã được tái cấu trúc để gọn gàng và dễ quản lý hơn. Tài liệu này hướng dẫn cách sử dụng cấu trúc mới.

## 📊 Thay đổi chính

### ❌ Cũ → ✅ Mới

| Cũ | Mới | Mô tả |
|---|---|---|
| `docker-compose.yml` | `deployment/docker/docker-compose.yml` | Docker configs |
| `scripts/deploy.sh` | `deployment/scripts/deploy.sh` | Deployment scripts |
| `nginx/nginx.conf` | `deployment/nginx/nginx.conf` | Nginx config |
| `env.production.example` | `deployment/environments/env.production.example` | Environment templates |
| `client/cypress/` | `tests/e2e/cypress/` | E2E tests |
| `docs/TESTING_GUIDE.md` | `docs/testing/TESTING_GUIDE.md` | Testing docs |
| `README_*.md` | `README.md` + organized docs | Consolidated docs |

## 🚀 Commands Mới

### Development
```bash
# Cũ
docker-compose up -d
docker-compose logs -f

# Mới  
npm run docker:up
npm run docker:logs
```

### Deployment
```bash
# Cũ
./scripts/deploy.sh
docker-compose -f docker-compose.prod.yml up -d

# Mới
npm run deploy
npm run docker:prod
```

### Testing
```bash
# Cũ
cd client && npm run cypress:open
docker-compose -f docker-compose.test.yml up

# Mới
npm run test:e2e:open
npm run test:docker
```

## 📁 Cấu trúc Mới

```
📦 meeting-management-app/
├── 🚀 deployment/           # Tất cả về deployment
│   ├── docker/             # Docker configurations
│   ├── nginx/              # Nginx configurations  
│   ├── scripts/            # Deployment scripts
│   └── environments/       # Environment templates
├── 📚 docs/                # Documentation có tổ chức
│   ├── deployment/         # Deployment guides
│   ├── development/        # Development guides
│   ├── testing/            # Testing documentation
│   └── api/                # API documentation
├── 🧪 tests/               # Cross-app tests
│   ├── e2e/               # End-to-end tests
│   └── integration/        # Integration tests
├── 📊 monitoring/          # Monitoring configs
├── 🛠️ tools/               # Development tools
├── 📄 client/              # Frontend (React)
├── ⚙️ server/              # Backend (Node.js)
└── 📋 README.md            # Main documentation
```

## 🔄 Migration Steps

### 1. Backup hiện tại (nếu cần)
```bash
# Backup toàn bộ dự án
cp -r . ../meeting-app-backup
```

### 2. Pull code mới
```bash
git pull origin main
```

### 3. Reinstall dependencies
```bash
npm install
```

### 4. Test cấu trúc mới
```bash
# Test development
npm run dev

# Test Docker
npm run docker:up
npm run docker:logs
```

### 5. Cleanup (tùy chọn)
```bash
# Chạy script cleanup để xóa file cũ
./tools/scripts/cleanup-old-structure.ps1
```

## 🔧 Cập nhật Scripts

### Docker Commands
```bash
# Development
npm run docker:build      # Build images
npm run docker:up          # Start containers  
npm run docker:down        # Stop containers
npm run docker:logs        # View logs

# Production
npm run docker:prod        # Start production

# Testing  
npm run test:docker        # Test in Docker
```

### Deployment Commands
```bash
npm run deploy             # Deploy to production
npm run setup:vps          # Setup VPS
```

## 📝 Environment Files

### Cũ
```
.env.production.example
client/.env.production.example
```

### Mới
```
deployment/environments/env.production.example
client/env.production.example
```

## 🔍 Tìm Files

### Documentation
- **Deployment**: `docs/deployment/`
- **Development**: `docs/development/`  
- **Testing**: `docs/testing/`
- **API**: `docs/api/`

### Configurations
- **Docker**: `deployment/docker/`
- **Nginx**: `deployment/nginx/`
- **Environment**: `deployment/environments/`
- **Scripts**: `deployment/scripts/`

### Tests
- **E2E**: `tests/e2e/`
- **Integration**: `tests/integration/`
- **Unit**: `client/src/__tests__/`, `server/tests/`

## ⚠️ Breaking Changes

### 1. Docker Compose Paths
```bash
# Cũ
docker-compose -f docker-compose.prod.yml up

# Mới  
docker-compose -f deployment/docker/docker-compose.prod.yml up
# Hoặc
npm run docker:prod
```

### 2. Script Paths
```bash
# Cũ
./scripts/deploy.sh

# Mới
./deployment/scripts/deploy.sh
# Hoặc
npm run deploy
```

### 3. Nginx Config
```bash
# Cũ
nginx/nginx.conf

# Mới
deployment/nginx/nginx.conf
```

## 🆘 Troubleshooting

### Issue: Docker build fails
```bash
# Solution: Update paths in docker-compose files
# Đã được cập nhật tự động trong cấu trúc mới
```

### Issue: Scripts not found
```bash
# Solution: Use npm scripts instead
npm run deploy          # thay vì ./scripts/deploy.sh
npm run setup:vps       # thay vì ./scripts/vps-setup.sh
```

### Issue: Environment files missing
```bash
# Solution: Copy from new location
cp deployment/environments/env.production.example .env
```

## ✅ Benefits của Cấu trúc Mới

- ✅ **Gọn gàng hơn**: Root directory không còn cluttered
- ✅ **Dễ tìm kiếm**: Files được nhóm theo chức năng
- ✅ **Scalable**: Dễ thêm features mới
- ✅ **Professional**: Theo industry standards
- ✅ **Maintainable**: Dễ bảo trì và cập nhật

## 📞 Support

Nếu gặp vấn đề trong quá trình migration:

1. Kiểm tra [README.md](README.md) mới
2. Xem documentation trong `docs/`
3. Tạo issue trên GitHub
4. Liên hệ team development

---

**🎉 Chúc mừng! Dự án đã có cấu trúc gọn gàng và professional hơn!**
