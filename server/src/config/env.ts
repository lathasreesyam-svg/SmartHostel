import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // Database (connection_limit=5 prevents pool exhaustion on scaled deploys)
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hostel_db',
  DB_CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-prod',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Redis — optional. Leave blank to disable caching (app still works)
  REDIS_URL: process.env.REDIS_URL || '',

  // Email — SendGrid SMTP (or any SMTP provider)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || 'apikey',           // SendGrid uses literal 'apikey'
  SMTP_PASS: (process.env.SMTP_PASS || '').trim(),            // Put your SendGrid API key here
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@smarthostel.edu',
  APP_URL: process.env.APP_URL || 'http://localhost:5173', // Frontend URL for email links

  // AI Service
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // Frontend - allow both docker (3000) and dev (5173)
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  // QR
  QR_SECRET: process.env.QR_SECRET || 'qr-secret-key',

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',
};

export default env;
