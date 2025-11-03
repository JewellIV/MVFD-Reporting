const express = require('express');
const path = require('path');
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
  try {
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
        // Continue with other models even if one fails
      }
    });
    
    console.log('✅ MongoDB compatibility layer added to Sequelize models');
  } catch (err) {
    console.error('❌ Error initializing MongoDB compatibility layer:', err.message);
    // Don't crash - routes might still work without the compatibility layer
  }
};

// Initialize compatibility layer - wrap in try-catch for serverless safety
try {
  addMongooseCompatibility();
} catch (err) {
  console.error('Failed to initialize compatibility layer:', err.message);
}
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

// Routes (with error handling)
const routeModules = [
  { path: '/api/auth', module: './routes/auth' },
  { path: '/api/nemsis', module: './routes/nemsis' },
  { path: '/api/nfirs', module: './routes/nfirs' },
  { path: '/api/neris', module: './routes/neris' },
  { path: '/api/epcrs', module: './routes/epcrs' },
  { path: '/api/cad', module: './routes/cad' },
  { path: '/api/google', module: './routes/google' },
  { path: '/api/upload', module: './routes/upload' },
  { path: '/api/roster', module: './routes/roster' },
  { path: '/api/validation', module: './routes/validation' },
  { path: '/api/analytics', module: './routes/analytics' },
  { path: '/api/backup', module: './routes/backup' },
  { path: '/api/notifications', module: './routes/notifications' }
  // Note: /api/health is handled inline below (after routes load) to ensure it works
];

let routesLoaded = 0;
routeModules.forEach(({ path, module }) => {
  try {
    app.use(path, require(module));
    routesLoaded++;
  } catch (error) {
    console.error(`❌ Error loading route ${path}:`, error.message);
    // Add a fallback route for failed modules
    app.use(path, (req, res) => {
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        message: `Route ${path} failed to load: ${error.message}`
      });
    });
  }
});

if (routesLoaded === routeModules.length) {
  console.log('✅ All API routes loaded successfully');
} else {
  console.warn(`⚠️  Only ${routesLoaded}/${routeModules.length} routes loaded successfully`);
}

// Root route handler (for API server)
app.get('/', (req, res) => {
  res.json({ 
    service: 'Mangohick Fire Reporting API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      nemsis: '/api/nemsis',
      nfirs: '/api/nfirs',
      neris: '/api/neris'
    },
    message: 'This is the API server. The frontend should be served separately.',
    vercel: !!process.env.VERCEL,
    path: req.path,
    url: req.url
  });
});

// Serve client build (optional - only if build exists)
if (process.env.SERVE_CLIENT === 'true') {
  const fs = require('fs');
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  const indexHtmlPath = path.join(clientBuildPath, 'index.html');
  
  // Check if client build directory exists
  if (fs.existsSync(clientBuildPath) && fs.existsSync(indexHtmlPath)) {
    app.use(express.static(clientBuildPath));
    // Send index.html for any non-API route
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(indexHtmlPath);
    });
    console.log('✅ Serving static client build from:', clientBuildPath);
  } else {
    console.warn('⚠️  SERVE_CLIENT=true but client build not found at:', clientBuildPath);
    console.warn('   The frontend should be deployed separately or SERVE_CLIENT should be false.');
  }
}

// Health check endpoint (register BEFORE 404 handler)
// Handle both /api/health and /api/health/ (with trailing slash)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Mangohick Fire Reporting API',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health/', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Mangohick Fire Reporting API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler for API routes (must come AFTER all route definitions)
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API route not found', 
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Database connection and server start
async function startServer() {
  try {
    if (process.env.DB_SKIP_INIT === 'true') {
      console.warn('⚠️  DB initialization skipped due to DB_SKIP_INIT=true');
    } else {
      try {
        await sequelize.authenticate();
        console.log('Database connected successfully');
        await sequelize.sync({ alter: true });
        console.log('Database synchronized');
      } catch (dbError) {
        console.error('⚠️  Database connection failed (continuing anyway):', dbError.message);
        // Don't exit - allow serverless functions to work without DB on startup
      }
    }

    // Only call app.listen() if not in serverless environment (Vercel, AWS Lambda, etc.)
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.RUN_SERVER !== 'false') {
      app.listen(PORT, () => {
        console.log(`🚒 Mangohick Fire Reporting Server running on port ${PORT}`);
        console.log(`📊 NEMSIS 3.5 & NFIRS/NERIS Reporting System`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        if (process.env.DB_SKIP_INIT === 'true') {
          console.log('⚠️  Running with DB initialization skipped');
        }
      });
    }
  } catch (error) {
    console.error('Unable to start server:', error);
    // In serverless, don't exit - just log the error
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
  }
}

// For Vercel/serverless: export the app handler
// Check if we're being imported from api/index.js (Vercel handler)
const isApiHandler = require.main && require.main.filename && require.main.filename.includes('api/index.js');
const isServerless = process.env.VERCEL || 
                     process.env.AWS_LAMBDA_FUNCTION_NAME || 
                     process.env.VERCEL_ENV ||
                     process.env.VERCEL_REGION ||
                     isApiHandler ||
                     (!process.env.RUN_SERVER || process.env.RUN_SERVER === 'false');

// Always export the app - Vercel will wrap it
module.exports = app;

// Only start server if NOT in serverless environment and not imported from API handler
if (!isServerless && !isApiHandler) {
  startServer();
} else {
  console.log('📦 Exported as serverless function handler');
  console.log('🔍 Environment:', {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION,
    isApiHandler: isApiHandler
  });
}