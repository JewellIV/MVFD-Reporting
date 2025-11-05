const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Load environment variables
require('dotenv').config();

// Check for critical environment variables and warn if missing
const criticalEnvVars = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

console.log('🔍 Environment Check:');
console.log(`   NODE_ENV: ${criticalEnvVars.NODE_ENV}`);
console.log(`   JWT_SECRET: ${criticalEnvVars.JWT_SECRET ? '✅ Set' : '❌ MISSING - Authentication will fail!'}`);
console.log(`   PORT: ${process.env.PORT || '5000 (default)'}`);
console.log(`   SERVE_CLIENT: ${process.env.SERVE_CLIENT || 'Not set'}`);

if (!criticalEnvVars.JWT_SECRET) {
  console.error('⚠️  WARNING: JWT_SECRET is not set! Authentication routes will fail.');
  console.error('   Set JWT_SECRET in your .env file or environment variables.');
}

// Initialize database connection (lazy-loaded, won't crash if unavailable)
const sequelize = require('./config/database');

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
  console.error('Stack:', err.stack);
}

// ===== End of compatibility layer =====

// Initialize Express app early to catch any errors
let app;
try {
  app = express();
} catch (err) {
  console.error('Failed to initialize Express:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

// Trust proxy for Vercel - but use specific IP ranges to avoid rate limit bypass
if (process.env.VERCEL) {
  // Vercel's proxy IPs - trust only Vercel's infrastructure
  app.set('trust proxy', 1); // Trust only the first proxy (Vercel's edge)
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  // For Vercel, use request IP from headers instead of trust proxy
  keyGenerator: (req) => {
    // Try to get real IP from various headers
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.ip ||
           req.connection.remoteAddress ||
           'unknown';
  }
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

// Wrap route loading in try-catch to prevent server crash
let routesLoaded = 0;
routeModules.forEach(({ path: routePath, module: modulePath }) => {
  try {
    // Extract just the filename from './routes/auth' -> 'auth'
    const routeName = modulePath.replace('./routes/', '');
    const routeFilePath = path.join(__dirname, 'routes', `${routeName}.js`);
    
    // Log for debugging
    console.log(`Attempting to load route ${routePath} from: ${routeFilePath}`);
    
    // Check if file exists
    if (fs.existsSync(routeFilePath)) {
      app.use(routePath, require(routeFilePath));
      routesLoaded++;
      console.log(`✅ Loaded route ${routePath} from ${routeFilePath}`);
    } else {
      // Try with require.resolve as fallback
      const resolvedPath = require.resolve(modulePath, { paths: [__dirname] });
      app.use(routePath, require(resolvedPath));
      routesLoaded++;
      console.log(`✅ Loaded route ${routePath} via require.resolve: ${resolvedPath}`);
    }
  } catch (error) {
    console.error(`❌ Error loading route ${routePath}:`, error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error(`   Module path attempted: ${modulePath}`);
      console.error(`   Current directory: ${__dirname}`);
      console.error(`   Files in routes directory:`, fs.existsSync(path.join(__dirname, 'routes')) ? 
        fs.readdirSync(path.join(__dirname, 'routes')).join(', ') : 'routes directory not found');
    }
    // Add a fallback route for failed modules
    app.use(routePath, (req, res) => {
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        message: `Route ${routePath} failed to load: ${error.message}`,
        code: error.code || 'UNKNOWN_ERROR',
        debug: {
          modulePath,
          currentDir: __dirname,
          attemptedPath: path.join(__dirname, 'routes', modulePath.replace('./routes/', '') + '.js')
        }
      });
    });
  }
});

if (routesLoaded === routeModules.length) {
  console.log('✅ All API routes loaded successfully');
} else {
  console.warn(`⚠️  Only ${routesLoaded}/${routeModules.length} routes loaded successfully`);
}

// Serve client build (optional - only if build exists)
// Check multiple possible locations for the build files
const possibleBuildPaths = [
  path.join(__dirname, '..', 'build'),              // Root level build directory
  path.join(__dirname, '..', 'client', 'build'),    // Client subdirectory build
  path.join(__dirname, '..', 'build-for-cpanel'),    // CPanel deployment build
  path.join(__dirname, '..', 'public'),              // Public directory
  path.join(__dirname, '..', 'dist'),                // Alternative build directory
  // Vercel serverless environment paths
  ...(process.env.VERCEL ? [
    path.join(process.env.LAMBDA_TASK_ROOT || __dirname, '..', 'client', 'build'),
    path.join('/var/task', 'client', 'build'),
  ] : []),
];

// Find the first existing build directory
let clientBuildPath = null;
let indexHtmlPath = null;

for (const buildPath of possibleBuildPaths) {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
    clientBuildPath = buildPath;
    indexHtmlPath = indexPath;
    console.log(`✅ Found build directory at: ${buildPath}`);
    break;
  }
}

// Log if no build found
if (!clientBuildPath) {
  console.warn('⚠️  No build directory found. Checked paths:');
  possibleBuildPaths.forEach(p => {
    console.warn(`   - ${p} (exists: ${fs.existsSync(p)})`);
  });
}

// Add startup logging (after routes are loaded)
console.log('🚀 Server initialization complete');
console.log(`📁 Client build path: ${clientBuildPath || 'Not found'}`);
console.log(`📄 Index HTML path: ${indexHtmlPath || 'Not found'}`);
console.log(`📦 Build exists: ${clientBuildPath && indexHtmlPath ? fs.existsSync(indexHtmlPath) : false}`);
console.log(`📦 Serve client: ${process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production'}`);
console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'MISSING - This will cause authentication errors!'}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// CRITICAL ROUTE ORDER:
// 1. Static file middleware (serves JS, CSS, images, favicon.ico)
// 2. React Router catch-all (serves index.html for SPA routes like /login)
// 3. Root route handler (fallback for /)
// 4. Favicon handler (fallback if static didn't serve it)
// 5. Health check endpoints
// 6. 404 handlers

if (process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production') {
  // Check if client build directory exists
  if (clientBuildPath && indexHtmlPath && fs.existsSync(clientBuildPath) && fs.existsSync(indexHtmlPath)) {
    try {
      // Serve static files from client build
      // Use absolute path for serverless environments
      const absoluteBuildPath = path.resolve(clientBuildPath);
      
      // IMPORTANT: Use fallthrough: true so static files can be checked first,
      // but if not found, it falls through to the catch-all route
      app.use(express.static(absoluteBuildPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true,
        fallthrough: true, // Allow fallthrough to catch-all for SPA routes
        setHeaders: (res, filePath) => {
          // Set proper content types for common file types
          if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          }
        }
      }));
      
      // Send index.html for any non-API route (React Router catch-all)
      // Must use absolute path for sendFile
      const absoluteIndexPath = path.resolve(indexHtmlPath);
      
      // Verify the file exists before setting up the route
      if (!fs.existsSync(absoluteIndexPath)) {
        throw new Error(`Index HTML file does not exist at: ${absoluteIndexPath}`);
      }
      
      // React Router catch-all - serve index.html for all non-API routes
      // This MUST come after static file middleware
      // With fallthrough: true, static files are checked first, then this handles SPA routes
      app.get(/^\/(?!api).*/, (req, res, next) => {
        // Skip static file requests (they should have been handled by express.static)
        // But if they weren't found, we'll get here - check if it's a static file request
        if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
          // Static file was requested but not found - return 404
          console.warn(`Static file not found: ${req.path}`);
          return res.status(404).json({ 
            error: 'Static file not found', 
            path: req.path,
            message: 'The requested static file was not found in the build directory',
            buildPath: absoluteBuildPath
          });
        }
        
        // Verify file still exists before sending
        if (!fs.existsSync(absoluteIndexPath)) {
          console.error(`Index HTML disappeared: ${absoluteIndexPath}`);
          return res.status(500).json({ 
            error: 'Frontend not available',
            message: 'The frontend build files are missing'
          });
        }
        
        try {
          res.sendFile(absoluteIndexPath, (err) => {
            if (err) {
              console.error('Error sending index.html:', err);
              console.error('Request path:', req.path);
              console.error('File path:', absoluteIndexPath);
              if (!res.headersSent) {
                res.status(500).json({ 
                  error: 'Failed to serve frontend',
                  message: err.message,
                  path: req.path
                });
              }
            }
          });
        } catch (error) {
          console.error('Error serving index.html:', error);
          console.error('Request path:', req.path);
          if (!res.headersSent) {
            next(error);
          }
        }
      });
      
      console.log('✅ Serving static client build from:', clientBuildPath);
      console.log('✅ React Router catch-all configured for SPA routing');
    } catch (error) {
      console.error('❌ Error setting up static file serving:', error.message);
      console.error('Stack:', error.stack);
      console.warn('   Frontend routes will not be available');
      
      // Add fallback route handler for errors
      app.get(/^\/(?!api).*/, (req, res) => {
        res.status(500).json({
          error: 'Frontend setup error',
          message: 'Static file serving failed to initialize',
          path: req.path
        });
      });
    }
  } else {
    console.warn('⚠️  Client build not found at:', clientBuildPath);
    console.warn('   Expected path:', indexHtmlPath);
    console.warn('   The frontend should be deployed separately or build the client first.');
    
    // Add a fallback route handler for non-API routes when build is missing
    app.get(/^\/(?!api).*/, (req, res) => {
      res.status(404).json({
        error: 'Frontend not available',
        message: 'The client build is not available. Please build the frontend or deploy it separately.',
        path: req.path,
        buildPath: clientBuildPath || 'Not found',
        indexPath: indexHtmlPath || 'Not found'
      });
    });
  }
} else {
  // Development mode or SERVE_CLIENT=false - add fallback for non-API routes
  app.get(/^\/(?!api).*/, (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      message: 'This is the API server. The frontend should be served separately.',
      path: req.path,
      hint: 'Set SERVE_CLIENT=true and build the client to serve it from this server'
    });
  });
}

// Root route handler - serve index.html for /
// This should only be reached if the catch-all didn't handle it
app.get('/', (req, res, next) => {
  // If we have a build, serve index.html
  if (clientBuildPath && indexHtmlPath && fs.existsSync(indexHtmlPath)) {
    const absoluteIndexPath = path.resolve(indexHtmlPath);
    res.sendFile(absoluteIndexPath, (err) => {
      if (err) {
        console.error('Error sending index.html for root:', err);
        if (!res.headersSent) {
          next(err);
        }
      }
    });
  } else {
    // No build available - show API info
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
  }
});

// Favicon handler - fallback if static middleware didn't serve it
app.get('/favicon.ico', (req, res) => {
  // Try to find and serve favicon from multiple locations
  const possibleFaviconPaths = [
    clientBuildPath ? path.join(clientBuildPath, 'favicon.ico') : null,
    path.join(__dirname, '..', 'build', 'favicon.ico'),
    path.join(__dirname, '..', 'client', 'build', 'favicon.ico'),
    path.join(__dirname, '..', 'build-for-cpanel', 'favicon.ico'),
    path.join(__dirname, '..', 'public', 'favicon.ico'),
  ].filter(Boolean); // Remove null values
  
  let faviconFound = false;
  for (const faviconPath of possibleFaviconPaths) {
    if (fs.existsSync(faviconPath)) {
      try {
        res.sendFile(path.resolve(faviconPath));
        faviconFound = true;
        break;
      } catch (error) {
        console.error('Error serving favicon:', error);
      }
    }
  }
  
  if (!faviconFound) {
    // Return 204 No Content instead of 404 to prevent browser console errors
    res.status(204).end();
  }
});

// Simple diagnostic endpoint (works even if server has issues)
app.get('/api/diagnostic', (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      server: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        workingDirectory: process.cwd(),
        serverDirectory: __dirname,
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        SERVE_CLIENT: process.env.SERVE_CLIENT || 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'MISSING',
        DB_HOST: process.env.DB_HOST ? 'Set' : 'not set',
        DB_NAME: process.env.DB_NAME ? 'Set' : 'not set',
        DB_USER: process.env.DB_USER ? 'Set' : 'not set'
      },
      build: {
        clientBuildPath: clientBuildPath || 'Not found',
        indexHtmlPath: indexHtmlPath || 'Not found',
        buildExists: clientBuildPath && indexHtmlPath ? fs.existsSync(indexHtmlPath) : false
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check endpoint (register BEFORE 404 handler)
// Handle both /api/health and /api/health/ (with trailing slash)
app.get('/api/health', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Mangohick Fire Reporting API',
      environment: process.env.NODE_ENV || 'development',
      diagnostics: {
        clientBuildPath: clientBuildPath || 'Not found',
        indexHtmlPath: indexHtmlPath || 'Not found',
        clientBuildExists: clientBuildPath ? fs.existsSync(clientBuildPath) : false,
        indexHtmlExists: indexHtmlPath ? fs.existsSync(indexHtmlPath) : false,
        serveClientEnabled: process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production',
        jwtSecretSet: !!process.env.JWT_SECRET,
        databaseConfig: {
          host: process.env.DB_HOST ? 'Set' : 'Missing',
          name: process.env.DB_NAME ? 'Set' : 'Missing',
          user: process.env.DB_USER ? 'Set' : 'Missing'
        },
        checkedPaths: possibleBuildPaths.map(p => ({
          path: p,
          exists: fs.existsSync(p),
          hasIndexHtml: fs.existsSync(path.join(p, 'index.html'))
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/api/health/', (req, res) => {
  // Same as /api/health but with trailing slash
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Mangohick Fire Reporting API',
      environment: process.env.NODE_ENV || 'development',
      diagnostics: {
        clientBuildPath: clientBuildPath || 'Not found',
        indexHtmlPath: indexHtmlPath || 'Not found',
        clientBuildExists: clientBuildPath ? fs.existsSync(clientBuildPath) : false,
        indexHtmlExists: indexHtmlPath ? fs.existsSync(indexHtmlPath) : false,
        serveClientEnabled: process.env.SERVE_CLIENT === 'true' || process.env.NODE_ENV === 'production',
        jwtSecretSet: !!process.env.JWT_SECRET,
        databaseConfig: {
          host: process.env.DB_HOST ? 'Set' : 'Missing',
          name: process.env.DB_NAME ? 'Set' : 'Missing',
          user: process.env.DB_USER ? 'Set' : 'Missing'
        },
        checkedPaths: possibleBuildPaths.map(p => ({
          path: p,
          exists: fs.existsSync(p),
          hasIndexHtml: fs.existsSync(path.join(p, 'index.html'))
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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
  // Log full error details
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ SERVER ERROR');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Error Message:', err.message);
  console.error('Request Path:', req.path);
  console.error('Request Method:', req.method);
  console.error('Request URL:', req.url);
  console.error('Request Query:', req.query);
  console.error('Stack Trace:', err.stack);
  console.error('═══════════════════════════════════════════════════════');
  
  // Don't send stack trace in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred processing your request'
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.path = req.path;
    errorResponse.method = req.method;
    errorResponse.details = {
      name: err.name,
      code: err.code
    };
  }
  
  // Make sure we haven't already sent a response
  if (!res.headersSent) {
    res.status(err.status || 500).json(errorResponse);
  } else {
    // If headers already sent, try to end the response
    console.error('⚠️  Headers already sent, cannot send error response');
  }
});

// Unhandled promise rejection handler (only register once)
if (!process.hasUnhandledRejectionHandler) {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ UNHANDLED PROMISE REJECTION');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Reason:', reason);
    console.error('Reason Stack:', reason?.stack);
    console.error('Promise:', promise);
    console.error('═══════════════════════════════════════════════════════');
    // Don't exit in production - log and continue
    if (process.env.NODE_ENV === 'development') {
      console.error('This is a development environment - you may want to fix this error');
    }
  });
  process.hasUnhandledRejectionHandler = true;
}

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ UNCAUGHT EXCEPTION - CRITICAL ERROR');
  console.error('═══════════════════════════════════════════════════════');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('═══════════════════════════════════════════════════════');
  // Don't exit in serverless environments
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error('Exiting process due to uncaught exception...');
    process.exit(1);
  }
});

// Database connection and server start
async function startServer() {
  try {
    console.log('🚀 Starting server...');
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`📁 Server directory: ${__dirname}`);
    console.log(`🌍 Node version: ${process.version}`);
    console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 PORT: ${process.env.PORT || 5000}`);
    
    if (process.env.DB_SKIP_INIT === 'true') {
      console.warn('⚠️  DB initialization skipped due to DB_SKIP_INIT=true');
    } else {
      try {
        console.log('📊 Attempting database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        try {
          await sequelize.sync({ alter: false }); // Changed to false to avoid data loss
          console.log('✅ Database synchronized');
        } catch (syncError) {
          console.warn('⚠️  Database sync warning (continuing anyway):', syncError.message);
          // Continue even if sync fails
        }
      } catch (dbError) {
        console.error('❌ Database connection failed (continuing anyway):', dbError.message);
        console.error('   Database host:', process.env.DB_HOST || 'not set');
        console.error('   Database name:', process.env.DB_NAME || 'not set');
        // Don't exit - allow serverless functions to work without DB on startup
      }
    }

    // Only call app.listen() if not in serverless environment (Vercel, AWS Lambda, etc.)
    if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.RUN_SERVER !== 'false') {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚒 Mangohick Fire Reporting Server running on port ${PORT}`);
        console.log(`📊 NEMSIS 3.5 & NFIRS/NERIS Reporting System`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Server accessible at: http://0.0.0.0:${PORT}`);
        if (process.env.DB_SKIP_INIT === 'true') {
          console.log('⚠️  Running with DB initialization skipped');
        }
      }).on('error', (err) => {
        console.error('❌ Failed to start server:', err.message);
        if (err.code === 'EADDRINUSE') {
          console.error(`   Port ${PORT} is already in use.`);
          console.error('   Try changing PORT in environment variables or stop the other service.');
        }
        process.exit(1);
      });
    }
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ CRITICAL ERROR: Unable to start server');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════');
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