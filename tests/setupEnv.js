const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '0';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'helpchess-test';
process.env.TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
process.env.MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/helpchess-test';
process.env.ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'test-access-token';
process.env.COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
process.env.ACCESS_JWT_SECRET = process.env.ACCESS_JWT_SECRET || 'test-access-jwt-secret-value';
process.env.REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || 'test-refresh-jwt-secret-value';
process.env.REFRESH_TOKEN_VALIDITY_IN_SECONDS =
  process.env.REFRESH_TOKEN_VALIDITY_IN_SECONDS || '604800';
process.env.SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || '';
process.env.SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || '';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
process.env.EXAMPLE_QUEUE_URL = process.env.EXAMPLE_QUEUE_URL || '';
process.env.EXAMPLE_QUEUE_REGION = process.env.EXAMPLE_QUEUE_REGION || '';

const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.resolve(__dirname, '../.env.example'), envPath);
}

require('app-module-path').addPath(path.resolve(__dirname, '../src'));
