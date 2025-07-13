# AI Crypto Trading SaaS - Deployment Guide

## 🚀 Complete "Zero to Production" System

This is a comprehensive AI-powered cryptocurrency trading SaaS platform with modular architecture, payment integration, AI agents, and production-ready deployment.

## 📋 System Overview

### Architecture Components

1. **Backend API** (Node.js + Express)
   - RESTful API with JWT authentication
   - MongoDB database with Mongoose ODM
   - Razorpay payment integration
   - Webhook handlers for real-time updates
   - Comprehensive error handling and logging

2. **AI Trading Engine** (Python + FastAPI)
   - Multiple AI trading strategies
   - Real-time market data processing
   - Risk management system
   - Strategy performance tracking

3. **Frontend** (React + Vite)
   - Modern responsive UI with Tailwind CSS
   - Real-time dashboard with charts
   - User management and settings
   - Admin panel for system management

4. **Database** (MongoDB)
   - User management and authentication
   - Trading data and strategies
   - Payment and subscription tracking
   - System logs and analytics

## 🛠 Prerequisites

### System Requirements
- **Node.js** 18+ 
- **Python** 3.8+
- **MongoDB** 4.4+
- **Redis** 6+ (optional, for caching)
- **Nginx** (for production)

### API Keys Required
- **Razorpay** (Payment Gateway)
  - Key ID and Key Secret
  - Webhook Secret
- **Delta Exchange** (Crypto Trading)
  - API Key and Secret
  - Webhook Secret
- **Email Service** (SMTP)
  - Gmail App Password or other SMTP provider

## 📦 Installation

### 1. Clone and Setup
```bash
# Extract the provided files
cd crypto-trading-saas

# Make deployment script executable
chmod +x deploy.sh

# Run deployment script
./deploy.sh
```

### 2. Environment Configuration

#### Backend (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/crypto-trading-saas

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=30d

# Razorpay
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# Delta Exchange
DELTA_API_KEY=your-delta-api-key
DELTA_API_SECRET=your-delta-api-secret
DELTA_WEBHOOK_SECRET=your-delta-webhook-secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AI Engine
AI_ENGINE_URL=http://localhost:8000
AI_ENGINE_API_KEY=your-ai-engine-api-key

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### AI Engine (.env)
```env
# AI Engine Configuration
PORT=8000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://localhost:27017/crypto-trading-saas

# API Keys
DELTA_API_KEY=your-delta-api-key
DELTA_API_SECRET=your-delta-api-secret

# AI Configuration
MODEL_PATH=./models
STRATEGY_CONFIG_PATH=./strategies/config.json

# Logging
LOG_LEVEL=INFO
LOG_FILE=./logs/ai-engine.log
```

## 🚀 Deployment Options

### Option 1: Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Monitor services
pm2 monit

# Stop services
pm2 stop all
```

### Option 3: Manual Startup
```bash
# Start services
./start.sh

# Stop services
./stop.sh
```

### Option 4: Systemd (Production)
```bash
# Copy service files
sudo cp *.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable crypto-trading-backend crypto-trading-ai-engine

# Start services
sudo systemctl start crypto-trading-backend crypto-trading-ai-engine

# Check status
sudo systemctl status crypto-trading-backend crypto-trading-ai-engine
```

## 🌐 Nginx Configuration

### SSL Setup with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration
```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend
    location / {
        root /path/to/crypto-trading-saas/frontend/crypto-trading-frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # AI Engine
    location /ai/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Webhook endpoints (no rate limiting)
    location /api/webhooks/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## 🔧 Configuration

### Database Setup
```bash
# MongoDB setup
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database user
mongo
> use crypto-trading-saas
> db.createUser({
    user: "cryptotrader",
    pwd: "secure-password",
    roles: ["readWrite"]
})
```

### Razorpay Setup
1. Create account at https://razorpay.com
2. Get API keys from Dashboard > Settings > API Keys
3. Set up webhooks at Dashboard > Settings > Webhooks
4. Add webhook URL: `https://your-domain.com/api/webhooks/razorpay`

### Delta Exchange Setup
1. Create account at https://www.delta.exchange
2. Generate API keys from Settings > API
3. Set up webhooks for order updates
4. Add webhook URL: `https://your-domain.com/api/webhooks/delta`

## 📊 Features

### User Features
- **Authentication**: JWT-based secure login/registration
- **Dashboard**: Real-time trading overview and P&L charts
- **AI Strategies**: Multiple configurable trading strategies
- **Risk Management**: Customizable risk parameters
- **Reports**: Comprehensive trading analytics
- **Payments**: Razorpay integration for subscriptions
- **Settings**: User preferences and API configuration

### Admin Features
- **User Management**: View, edit, ban/unban users
- **System Monitoring**: Real-time system health
- **Coupon Management**: Create and manage discount codes
- **Logs**: System and webhook logs
- **Analytics**: Revenue and user growth metrics

### AI Trading Features
- **Technical Analysis**: RSI, MACD, Bollinger Bands strategies
- **Machine Learning**: Adaptive learning algorithms
- **Risk Management**: Stop-loss, take-profit, position sizing
- **Multi-Exchange**: Support for multiple exchanges
- **Real-time Processing**: Live market data analysis

## 🔒 Security

### Best Practices Implemented
- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Helmet.js security headers
- MongoDB injection prevention
- XSS protection
- API key encryption

### Additional Security Measures
```bash
# Firewall setup
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

## 📈 Monitoring

### Log Files
- Backend: `logs/backend-*.log`
- AI Engine: `logs/ai-engine-*.log`
- Nginx: `/var/log/nginx/`
- MongoDB: `/var/log/mongodb/`

### Health Checks
- Backend: `GET /health`
- AI Engine: `GET /health`
- Database: Connection status in logs

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
iotop
```

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check logs
tail -f logs/backend-error.log

# Check MongoDB connection
mongo --eval "db.adminCommand('ismaster')"

# Check environment variables
cat backend/.env
```

#### AI Engine Issues
```bash
# Check Python dependencies
pip3 list

# Check logs
tail -f logs/ai-engine-error.log

# Test AI engine directly
curl http://localhost:8000/health
```

#### Frontend Build Issues
```bash
# Clear cache and rebuild
cd frontend/crypto-trading-frontend
rm -rf node_modules dist
npm install
npm run build
```

### Database Issues
```bash
# MongoDB repair
sudo mongod --repair

# Check disk space
df -h

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

## 📞 Support

### Log Analysis
- Check application logs in `logs/` directory
- Monitor system resources with `htop`
- Use `pm2 logs` for PM2 deployments
- Check Nginx logs in `/var/log/nginx/`

### Performance Optimization
- Enable MongoDB indexing
- Use Redis for caching
- Optimize Nginx configuration
- Monitor memory usage
- Set up log rotation

## 🔄 Updates

### Application Updates
```bash
# Backup database
mongodump --db crypto-trading-saas --out backup/

# Pull updates
git pull origin main

# Install dependencies
npm install
pip3 install -r requirements.txt

# Rebuild frontend
cd frontend/crypto-trading-frontend
npm run build

# Restart services
pm2 restart all
```

### Database Migrations
- Check `docs/migrations/` for database schema changes
- Run migration scripts before updating application
- Always backup before migrations

## 📋 Maintenance

### Regular Tasks
- **Daily**: Check logs and system health
- **Weekly**: Review trading performance and user activity
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Database optimization and cleanup

### Backup Strategy
```bash
# Database backup
mongodump --db crypto-trading-saas --out backup/$(date +%Y%m%d)

# Application backup
tar -czf backup/app-$(date +%Y%m%d).tar.gz crypto-trading-saas/

# Automated backup script
0 2 * * * /path/to/backup-script.sh
```

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Database secured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] API keys secured
- [ ] Webhook endpoints tested
- [ ] Payment gateway tested
- [ ] Email notifications working
- [ ] Admin access configured
- [ ] Documentation updated

## 📚 Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)
- [Nginx Security](https://nginx.org/en/docs/http/securing_http.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**🚀 Your AI Crypto Trading SaaS is now ready for production!**

For support or questions, refer to the troubleshooting section or check the application logs.

