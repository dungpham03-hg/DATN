#!/bin/bash

# ======================
# Setup for Local Development
# ======================

echo "🔧 Setting up local development environment..."

# Create .env for server
cat > server/.env << EOF
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
EOF

# Create .env.local for client
cat > client/.env.local << EOF
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
DANGEROUSLY_DISABLE_HOST_CHECK=true
EOF

echo "✅ Environment files created!"
echo ""
echo "📦 Installing dependencies..."
echo ""

# Install server dependencies
echo "Server dependencies..."
cd server
npm install

# Install client dependencies
cd ../client
npm install

cd ..

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start development:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm start"
echo ""

