#!/bin/bash

# AI Crypto Trading SaaS - Deployment Script
# This script sets up and deploys the complete system

set -e

echo "🚀 Starting AI Crypto Trading SaaS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB is not installed locally. Make sure you have a MongoDB connection string."
fi

print_success "System requirements check passed!"

# Set up environment variables
print_status "Setting up environment variables..."

# Backend environment
if [ ! -f "backend/.env" ]; then
    print_status "Creating backend environment file..."
    cp backend/.env.example backend/.env
    print_warning "Please update backend/.env with your actual configuration values"
fi

# AI Engine environment
if [ ! -f "ai-engine/.env" ]; then
    print_status "Creating AI engine environment file..."
    cp ai-engine/.env.example ai-engine/.env
    print_warning "Please update ai-engine/.env with your actual configuration values"
fi

# Install dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

print_status "Installing frontend dependencies..."
cd frontend/crypto-trading-frontend
npm install
cd ../..

print_status "Installing AI engine dependencies..."
cd ai-engine
pip3 install -r requirements.txt
cd ..

print_success "Dependencies installed successfully!"

# Build frontend
print_status "Building frontend for production..."
cd frontend/crypto-trading-frontend
npm run build
cd ../..

print_success "Frontend built successfully!"

# Set up PM2 ecosystem file
print_status "Setting up PM2 ecosystem..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'crypto-trading-backend',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'crypto-trading-ai-engine',
      script: 'python3',
      args: './ai-engine/main.py',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PYTHONPATH: './ai-engine',
        PORT: 8000
      },
      error_file: './logs/ai-engine-error.log',
      out_file: './logs/ai-engine-out.log',
      log_file: './logs/ai-engine-combined.log',
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

print_success "PM2 ecosystem configured!"

# Set up Nginx configuration (optional)
print_status "Creating Nginx configuration template..."
cat > nginx.conf << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/crypto-trading-saas/frontend/crypto-trading-frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # AI Engine
    location /ai/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

print_success "Nginx configuration template created!"

# Create systemd service files
print_status "Creating systemd service files..."

# Backend service
cat > crypto-trading-backend.service << EOF
[Unit]
Description=Crypto Trading Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF

# AI Engine service
cat > crypto-trading-ai-engine.service << EOF
[Unit]
Description=Crypto Trading AI Engine
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/ai-engine
ExecStart=/usr/bin/python3 main.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=$(pwd)/ai-engine
Environment=PORT=8000

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd service files created!"

# Create startup script
print_status "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting AI Crypto Trading SaaS..."

# Start backend
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Start AI engine
echo "Starting AI engine..."
cd ai-engine
python3 main.py &
AI_ENGINE_PID=$!
cd ..

echo "✅ Services started!"
echo "Backend PID: $BACKEND_PID"
echo "AI Engine PID: $AI_ENGINE_PID"

# Save PIDs for stopping later
echo $BACKEND_PID > .backend.pid
echo $AI_ENGINE_PID > .ai-engine.pid

echo "📊 Backend: http://localhost:5000"
echo "🤖 AI Engine: http://localhost:8000"
echo "🌐 Frontend: Serve the built files from frontend/crypto-trading-frontend/dist"

# Wait for services
wait
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping AI Crypto Trading SaaS..."

# Stop backend
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        rm .backend.pid
    fi
fi

# Stop AI engine
if [ -f .ai-engine.pid ]; then
    AI_ENGINE_PID=$(cat .ai-engine.pid)
    if kill -0 $AI_ENGINE_PID 2>/dev/null; then
        echo "Stopping AI engine (PID: $AI_ENGINE_PID)..."
        kill $AI_ENGINE_PID
        rm .ai-engine.pid
    fi
fi

echo "✅ Services stopped!"
EOF

chmod +x stop.sh

print_success "Startup and stop scripts created!"

# Create Docker setup (optional)
print_status "Creating Docker configuration..."

# Dockerfile for backend
cat > backend/Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
EOF

# Dockerfile for AI engine
cat > ai-engine/Dockerfile << EOF
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
EOF

# Docker Compose
cat > docker-compose.yml << EOF
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: crypto-trading-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: crypto-trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    container_name: crypto-trading-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/crypto-trading-saas?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  ai-engine:
    build: ./ai-engine
    container_name: crypto-trading-ai-engine
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/crypto-trading-saas?authSource=admin
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./ai-engine:/app

  nginx:
    image: nginx:alpine
    container_name: crypto-trading-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/crypto-trading-frontend/dist:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - ai-engine

volumes:
  mongodb_data:
EOF

print_success "Docker configuration created!"

# Final instructions
print_success "🎉 Deployment setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Update environment variables in backend/.env and ai-engine/.env"
echo "2. Set up your MongoDB database"
echo "3. Configure your Razorpay and Delta Exchange API keys"
echo "4. Choose your deployment method:"
echo ""
echo "   🐳 Docker (Recommended):"
echo "   docker-compose up -d"
echo ""
echo "   📦 PM2:"
echo "   npm install -g pm2"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "   🔧 Manual:"
echo "   ./start.sh"
echo ""
echo "   🌐 Systemd (Production):"
echo "   sudo cp *.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable crypto-trading-backend crypto-trading-ai-engine"
echo "   sudo systemctl start crypto-trading-backend crypto-trading-ai-engine"
echo ""
echo "📊 Access URLs:"
echo "   Frontend: http://localhost (with Nginx) or serve dist/ folder"
echo "   Backend API: http://localhost:5000"
echo "   AI Engine: http://localhost:8000"
echo ""
echo "📁 Important Files:"
echo "   - backend/.env: Backend configuration"
echo "   - ai-engine/.env: AI engine configuration"
echo "   - nginx.conf: Nginx configuration"
echo "   - docker-compose.yml: Docker setup"
echo "   - ecosystem.config.js: PM2 configuration"
echo ""
print_warning "Remember to secure your server, set up SSL certificates, and configure firewalls!"
print_success "Happy trading! 🚀"

