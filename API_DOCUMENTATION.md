# API Documentation - AI Crypto Trading SaaS

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "subscriptionPlan": "free"
    },
    "token": "jwt_token"
  }
}
```

### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Current User
```http
GET /auth/me
```
*Requires authentication*

### Forgot Password
```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### Reset Password
```http
PUT /auth/reset-password/:resetToken
```

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

## User Endpoints

### Get Dashboard Data
```http
GET /user/dashboard
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPnL": 1250.50,
    "todayPnL": 45.20,
    "totalTrades": 156,
    "winRate": 0.68,
    "activeTrades": 3,
    "recentTrades": [...],
    "pnlChart": [...]
  }
}
```

### Update Profile
```http
PUT /user/profile
```
*Requires authentication*

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

### Toggle Trading
```http
POST /user/toggle-trading
```
*Requires authentication*

**Request Body:**
```json
{
  "tradingActive": true
}
```

### Get Settings
```http
GET /user/settings
```
*Requires authentication*

### Update Settings
```http
PUT /user/settings
```
*Requires authentication*

**Request Body:**
```json
{
  "riskSettings": {
    "dailyLossCap": 1000,
    "maxTradeCountPerDay": 10,
    "maxTradeSizePercent": 5,
    "stopLossPercentage": 0.02,
    "takeProfitPercentage": 0.04
  },
  "notifications": {
    "emailNotifications": true,
    "tradeAlerts": true,
    "dailyReports": true
  }
}
```

## Trading Endpoints

### Get Trading Overview
```http
GET /trading/overview
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "tradingActive": true
    },
    "activeTrades": [...],
    "recentTrades": [...],
    "signals": [...]
  }
}
```

### Get Strategies Overview
```http
GET /strategies/overview
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "availableStrategies": [...],
    "userStrategies": {
      "rsi_strategy": true,
      "macd_strategy": false
    },
    "performance": {
      "rsi_strategy": {
        "signals": 45,
        "winRate": 0.72,
        "pnl": 234.50
      }
    }
  }
}
```

### Toggle Strategy
```http
POST /strategies/toggle
```
*Requires authentication*

**Request Body:**
```json
{
  "strategyName": "rsi_strategy",
  "enabled": true
}
```

## Reports Endpoints

### Get P&L Data
```http
GET /reports/pnl?period=30d
```
*Requires authentication*

**Query Parameters:**
- `period`: 7d, 30d, 90d, 1y

**Response:**
```json
{
  "success": true,
  "data": {
    "pnlData": [
      {
        "date": "2024-01-01",
        "dailyPnL": 45.20,
        "cumulativePnL": 1250.50
      }
    ]
  }
}
```

### Get Strategy Performance
```http
GET /reports/strategy-performance?period=30d
```
*Requires authentication*

### Get Coin Performance
```http
GET /reports/coin-performance?period=30d
```
*Requires authentication*

### Get Trading Metrics
```http
GET /reports/metrics?period=30d
```
*Requires authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalPnL": 1250.50,
      "winRate": 0.68,
      "totalTrades": 156,
      "sharpeRatio": 1.45,
      "maxDrawdown": -125.30,
      "bestTrade": 89.50,
      "worstTrade": -45.20
    }
  }
}
```

### Generate Report
```http
POST /reports/generate
```
*Requires authentication*

**Request Body:**
```json
{
  "reportType": "monthly",
  "format": "pdf"
}
```

### Send Daily Report Email
```http
POST /reports/send-daily
```
*Requires authentication*

## Payment Endpoints

### Create Order
```http
POST /payments/create-order
```
*Requires authentication*

**Request Body:**
```json
{
  "planType": "pro",
  "billingCycle": "monthly",
  "couponCode": "SAVE20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "amount": 2900,
    "currency": "INR",
    "razorpayOrderId": "order_razorpay_id"
  }
}
```

### Verify Payment
```http
POST /payments/verify
```
*Requires authentication*

**Request Body:**
```json
{
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature"
}
```

### Get Payment History
```http
GET /payments/history
```
*Requires authentication*

### Apply Coupon
```http
POST /payments/apply-coupon
```
*Requires authentication*

**Request Body:**
```json
{
  "couponCode": "SAVE20",
  "planType": "pro"
}
```

### Validate Coupon
```http
POST /payments/validate-coupon
```
*Requires authentication*

**Request Body:**
```json
{
  "couponCode": "SAVE20"
}
```

## Webhook Endpoints

### Razorpay Webhook
```http
POST /webhooks/razorpay
```
*Public endpoint - webhook signature verification*

### Delta Exchange Webhook
```http
POST /webhooks/delta
```
*Public endpoint - webhook signature verification*

### Get Webhook Logs (Admin)
```http
GET /webhooks/logs
```
*Requires admin authentication*

## Admin Endpoints

### Get Admin Dashboard
```http
GET /admin/dashboard
```
*Requires admin authentication*

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1250,
      "activeTraders": 890,
      "monthlyRevenue": 58000,
      "totalTrades": 15600
    },
    "recentUsers": [...],
    "systemHealth": {
      "status": "healthy",
      "apiResponseTime": "120ms",
      "databaseStatus": "healthy"
    }
  }
}
```

### Get All Users
```http
GET /admin/users
```
*Requires admin authentication*

### Update User
```http
PUT /admin/users/:id
```
*Requires admin authentication*

**Request Body:**
```json
{
  "name": "Updated Name",
  "status": "active",
  "subscriptionPlan": "pro"
}
```

### Delete User
```http
DELETE /admin/users/:id
```
*Requires admin authentication*

### Toggle User Trading
```http
POST /admin/users/:id/toggle-trading
```
*Requires admin authentication*

### Get System Logs
```http
GET /admin/logs
```
*Requires admin authentication*

### Get System Statistics
```http
GET /admin/stats
```
*Requires admin authentication*

### Get All Coupons
```http
GET /admin/coupons
```
*Requires admin authentication*

### Create Coupon
```http
POST /admin/coupons
```
*Requires admin authentication*

**Request Body:**
```json
{
  "code": "SAVE20",
  "description": "20% off all plans",
  "discountType": "percentage",
  "discountValue": 20,
  "maxUses": 100,
  "expiresAt": "2024-12-31T23:59:59.000Z",
  "isActive": true
}
```

### Update Coupon
```http
PUT /admin/coupons/:id
```
*Requires admin authentication*

### Delete Coupon
```http
DELETE /admin/coupons/:id
```
*Requires admin authentication*

### Emergency Stop
```http
POST /admin/emergency-stop
```
*Requires admin authentication*

## AI Engine Endpoints

### Health Check
```http
GET /ai/health
```

### Generate Trading Signal
```http
POST /ai/generate-signal
```

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "strategy": "rsi_strategy",
  "timeframe": "1h"
}
```

### Get Strategy Performance
```http
GET /ai/strategy-performance/:strategyName
```

### Update Strategy Configuration
```http
PUT /ai/strategy-config/:strategyName
```

**Request Body:**
```json
{
  "parameters": {
    "rsi_period": 14,
    "rsi_overbought": 70,
    "rsi_oversold": 30
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Invalid or missing authentication |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `USER_NOT_FOUND` | User does not exist |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `DUPLICATE_EMAIL` | Email already registered |
| `PAYMENT_FAILED` | Payment processing failed |
| `INVALID_COUPON` | Coupon code is invalid or expired |
| `TRADING_DISABLED` | Trading is disabled for user |
| `INSUFFICIENT_BALANCE` | Insufficient account balance |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_SERVER_ERROR` | Server error |

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests/minute |
| General API | 100 requests/minute |
| Trading API | 60 requests/minute |
| Reports | 30 requests/minute |
| Webhooks | No limit |

## Pagination

For endpoints that return lists, use these query parameters:

```http
GET /endpoint?page=1&limit=20&sort=createdAt&order=desc
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default: createdAt)
- `order`: Sort order (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('wss://your-domain.com', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Events

#### Trading Updates
```javascript
socket.on('trade_executed', (data) => {
  console.log('Trade executed:', data);
});

socket.on('signal_generated', (data) => {
  console.log('New signal:', data);
});

socket.on('pnl_update', (data) => {
  console.log('P&L updated:', data);
});
```

#### System Updates
```javascript
socket.on('system_alert', (data) => {
  console.log('System alert:', data);
});

socket.on('maintenance_mode', (data) => {
  console.log('Maintenance mode:', data);
});
```

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

class CryptoTradingAPI {
  constructor(baseURL, token) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getDashboard() {
    const response = await this.client.get('/user/dashboard');
    return response.data;
  }

  async toggleTrading(active) {
    const response = await this.client.post('/user/toggle-trading', {
      tradingActive: active
    });
    return response.data;
  }
}

// Usage
const api = new CryptoTradingAPI('https://your-domain.com/api', 'your_jwt_token');
const dashboard = await api.getDashboard();
```

### Python
```python
import requests

class CryptoTradingAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_dashboard(self):
        response = requests.get(f'{self.base_url}/user/dashboard', headers=self.headers)
        return response.json()
    
    def toggle_trading(self, active):
        data = {'tradingActive': active}
        response = requests.post(f'{self.base_url}/user/toggle-trading', 
                               json=data, headers=self.headers)
        return response.json()

# Usage
api = CryptoTradingAPI('https://your-domain.com/api', 'your_jwt_token')
dashboard = api.get_dashboard()
```

## Testing

### Postman Collection
Import the provided Postman collection for easy API testing.

### cURL Examples
```bash
# Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Dashboard
curl -X GET https://your-domain.com/api/user/dashboard \
  -H "Authorization: Bearer your_jwt_token"

# Toggle Trading
curl -X POST https://your-domain.com/api/user/toggle-trading \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"tradingActive":true}'
```

---

This API documentation covers all available endpoints in the AI Crypto Trading SaaS platform. For additional support or questions, please refer to the deployment guide or contact support.

