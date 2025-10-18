# 🏢 Meeting Management Application

Ứng dụng quản lý cuộc họp toàn diện với React, Node.js, MongoDB và Docker.

## 📁 Cấu trúc Dự án

```
📦 meeting-management-app/
├── 🎯 apps/                          # Ứng dụng chính (sẽ di chuyển vào đây)
├── 🚀 deployment/                    # Deployment & DevOps
│   ├── docker/                      # Docker configurations
│   │   ├── docker-compose.yml       # Development
│   │   ├── docker-compose.prod.yml  # Production
│   │   └── docker-compose.test.yml  # Testing
│   ├── nginx/                       # Nginx configurations
│   ├── scripts/                     # Deployment scripts
│   │   ├── deploy.sh               # Production deployment
│   │   └── vps-setup.sh            # VPS initial setup
│   └── environments/                # Environment templates
│       └── env.production.example   # Production env template
├── 📊 monitoring/                    # Monitoring & Observability
│   ├── prometheus/                  # Prometheus config
│   └── grafana/                     # Grafana dashboards
├── 📚 docs/                         # Documentation
│   ├── deployment/                  # Deployment guides
│   ├── development/                 # Development guides
│   ├── testing/                     # Testing documentation
│   └── api/                         # API documentation
├── 🧪 tests/                        # Cross-app tests
│   ├── e2e/                        # End-to-end tests
│   └── integration/                 # Integration tests
├── 🛠️ tools/                        # Development tools
│   ├── scripts/                     # Utility scripts
│   └── configs/                     # Tool configurations
├── 📄 client/                       # Frontend (React)
├── ⚙️ server/                       # Backend (Node.js)
└── 📋 package.json                  # Workspace configuration
```

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test
```

### Production Deployment
```bash
# Setup VPS (run once)
npm run setup:vps

# Deploy to production
npm run deploy

# Monitor deployment
npm run docker:logs
```

## 📖 Documentation

- **🚀 [Deployment Guide](docs/deployment/VPS_DEPLOYMENT_GUIDE.md)** - Deploy lên VPS
- **🧪 [Testing Guide](docs/testing/TESTING_GUIDE.md)** - Quy trình kiểm thử
- **💻 [Development Guide](docs/development/DEVELOPMENT_GUIDE.md)** - Setup development

## 🐳 Docker Commands

```bash
# Development
npm run docker:up          # Start dev containers
npm run docker:down        # Stop containers
npm run docker:logs        # View logs

# Production
npm run docker:prod        # Start production containers

# Testing
npm run test:docker        # Run tests in Docker
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm test` | Run all tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run deploy` | Deploy to production |
| `npm run setup:vps` | Setup VPS |

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI Framework
- **Material-UI** - Component library
- **Socket.IO** - Real-time communication
- **Cypress** - E2E testing

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **JWT** - Authentication
- **Jest** - Unit testing

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Prometheus** - Monitoring
- **Grafana** - Visualization

## 🌟 Features

- ✅ **Meeting Management** - Tạo, quản lý cuộc họp
- ✅ **Real-time Updates** - Cập nhật thời gian thực
- ✅ **User Authentication** - Đăng nhập đa dạng (OAuth)
- ✅ **Role-based Access** - Phân quyền người dùng
- ✅ **File Management** - Upload, quản lý tài liệu
- ✅ **Notifications** - Thông báo tự động
- ✅ **Reports & Analytics** - Báo cáo và thống kê
- ✅ **Mobile Responsive** - Tương thích mobile

## 🔒 Security Features

- 🛡️ **JWT Authentication**
- 🔐 **Rate Limiting**
- 🚫 **CORS Protection**
- 🔒 **Security Headers**
- 👤 **Non-root Containers**
- 🔑 **Environment Variables**

## 📈 Performance Optimizations

- ⚡ **Docker Multi-stage Builds**
- 🗜️ **Gzip Compression**
- 💾 **Static Asset Caching**
- 🔄 **Connection Pooling**
- 📊 **Performance Monitoring**
- 🧹 **Automatic Cleanup**

## 🆘 Support

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**🎯 Ready for production deployment on VPS!**
