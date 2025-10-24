# ======================
# Setup for Local Development (Windows)
# ======================

Write-Host "🔧 Setting up local development environment..." -ForegroundColor Cyan

# Create .env for server
$serverEnv = @"
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/meeting_management
JWT_SECRET=local_dev_secret_key_minimum_32_characters_12345
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
DOMAIN_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads/
ENABLE_DOMAIN_LOGIN=false
REQUIRE_DOMAIN_VALIDATION=false
"@

$serverEnv | Out-File -FilePath "server\.env" -Encoding UTF8

# Create .env.local for client
$clientEnv = @"
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
DANGEROUSLY_DISABLE_HOST_CHECK=true
"@

$clientEnv | Out-File -FilePath "client\.env.local" -Encoding UTF8

Write-Host "✅ Environment files created!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
Write-Host ""

# Install server dependencies
Write-Host "Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Install client dependencies
Write-Host "Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

Write-Host ""
Write-Host "✅ Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 To start development:" -ForegroundColor Cyan
Write-Host "   Terminal 1: cd server; npm start" -ForegroundColor White
Write-Host "   Terminal 2: cd client; npm start" -ForegroundColor White
Write-Host ""

