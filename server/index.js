const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/nemsis', require('./routes/nemsis'));
app.use('/api/nfirs', require('./routes/nfirs'));
app.use('/api/neris', require('./routes/neris'));
app.use('/api/epcrs', require('./routes/epcrs'));
app.use('/api/cad', require('./routes/cad'));
app.use('/api/google', require('./routes/google'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/roster', require('./routes/roster'));
app.use('/api/validation', require('./routes/validation'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/health', require('./routes/health'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Mangohick Fire Reporting API'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection and server start
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('MySQL database connected successfully');
    
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('Database synchronized');
    
    app.listen(PORT, () => {
      console.log(`🚒 Mangohick Fire Reporting Server running on port ${PORT}`);
      console.log(`📊 NEMSIS 3.5 & NFIRS/NERIS Reporting System`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();