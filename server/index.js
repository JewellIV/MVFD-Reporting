const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const sequelize = require('./config/database');
require('dotenv').config();

// ===== CRITICAL FIX: MongoDB to Sequelize Compatibility Layer =====
// This adds MongoDB-style methods to Sequelize models so routes can work
const addMongooseCompatibility = () => {
  const { Op } = require('sequelize');
  const models = ['NerisRecord', 'NemsisRecord', 'NfirsRecord', 'User'];
  
  models.forEach(modelName => {
    try {
      const Model = require(`./models/${modelName}`);
      
      // Add .find() method (converts to .findAll()) with chainable methods
      if (!Model.find) {
        class QueryBuilder {
          constructor(Model, query = {}) {
            this.Model = Model;
            this.sequelizeQuery = { where: {}, include: [] };
            
            // Convert MongoDB query to Sequelize
            Object.keys(query).forEach(key => {
              if (key === '_id') {
                this.sequelizeQuery.where.id = query[key];
              } else if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
                // Handle operators like $gte, $lte
                if (query[key].$gte) this.sequelizeQuery.where[key] = { [Op.gte]: query[key].$gte };
                if (query[key].$lte) this.sequelizeQuery.where[key] = { [Op.lte]: query[key].$lte };
              } else {
                this.sequelizeQuery.where[key] = query[key];
              }
            });
          }
          
          sort(fields) {
            const field = Object.keys(fields)[0];
            const direction = fields[field] === -1 ? 'DESC' : 'ASC';
            this.sequelizeQuery.order = [[field, direction]];
            return this;
          }
          
          limit(num) {
            this.sequelizeQuery.limit = num;
            return this;
          }
          
          skip(num) {
            this.sequelizeQuery.offset = num;
            return this;
          }
          
          async populate() {
            // populate() is a no-op for now - need proper associations
            return this;
          }
          
          async exec() {
            return Model.findAll(this.sequelizeQuery);
          }
          
          then(onFulfilled, onRejected) {
            return this.exec().then(onFulfilled, onRejected);
          }
        }
        
        Model.find = function(query = {}) {
          const builder = new QueryBuilder(Model, query);
          return builder;
        };
      }
      
      // Add .countDocuments() method (converts to .count())
      if (!Model.countDocuments) {
        Model.countDocuments = function(query = {}) {
          const where = {};
          Object.keys(query).forEach(key => {
            if (query[key] && typeof query[key] === 'object' && !Array.isArray(query[key])) {
              if (query[key].$gte) where[key] = { [Op.gte]: query[key].$gte };
              if (query[key].$lte) where[key] = { [Op.lte]: query[key].$lte };
            } else {
              where[key] = query[key];
            }
          });
          return Model.count({ where });
        };
      }
      
      // Add .findById() method (converts to .findByPk())
      if (!Model.findById) {
        Model.findById = function(id) {
          return Model.findByPk(id);
        };
      }
      
      // Add .findByIdAndDelete() method (converts to .destroy())
      if (!Model.findByIdAndDelete) {
        Model.findByIdAndDelete = function(id) {
          return Model.destroy({ where: { id } });
        };
      }
      
      // Make .populate() a no-op for now (will need proper associations)
      if (!Model.prototype.populate) {
        Model.prototype.populate = function() {
          return this;
        };
      }
    } catch (err) {
      console.warn(`Could not add compatibility to ${modelName}:`, err.message);
    }
  });
  
  console.log('✅ MongoDB compatibility layer added to Sequelize models');
};

addMongooseCompatibility();
// ===== End of compatibility layer =====

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