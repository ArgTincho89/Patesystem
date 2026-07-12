const path = require('path');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  dataDir: process.env.DATA_DIR || path.join(__dirname, '..', 'data'),
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  },
  smtpFrom: process.env.SMTP_FROM || 'no-reply@patesystem.com',
  onesignal: {
    appId: process.env.ONESIGNAL_APP_ID || '',
    apiKey: process.env.ONESIGNAL_API_KEY || ''
  },
  isTest: process.env.NODE_ENV === 'test'
};

module.exports = config;
