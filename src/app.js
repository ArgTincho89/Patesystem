const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const JsonDB = require('./db/jsondb');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const transactionRoutes = require('./routes/transactions');
const summaryRoutes = require('./routes/summary');
const trendsRoutes = require('./routes/trends');

const app = express();

const db = new JsonDB(config.dataDir);
app.locals.db = db;

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/trends', trendsRoutes);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);

module.exports = app;
