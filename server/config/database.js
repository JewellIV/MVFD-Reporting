require('dotenv').config();

let sequelize = null;
let sequelizeInitialized = false;

// Lazy initialization function - only creates Sequelize instance when needed
function initializeSequelize() {
  if (sequelizeInitialized && sequelize) {
    return sequelize;
  }
  
  if (sequelizeInitialized && !sequelize) {
    // Already tried and failed
    throw new Error('Database not available. mysql2 package may be missing.');
  }

  try {
    const { Sequelize } = require('sequelize');
    
    // Support different deployment styles
    const DIALECT = (process.env.DB_DIALECT || 'mysql').toLowerCase();

    if (process.env.DATABASE_URL) {
      // Use connection URL if provided (e.g., mysql://user:pass@host:port/db)
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: DIALECT,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: { timestamps: true, underscored: true, freezeTableName: true },
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
      });
    } else if (DIALECT === 'sqlite') {
      // Lightweight fallback for environments without MySQL
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: process.env.SQLITE_STORAGE || ':memory:',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: { timestamps: true, underscored: true, freezeTableName: true }
      });
    } else {
      // Default: MySQL via individual env vars
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
      
      const sequelizeConfig = {
        host: dbHost,
        port: dbPort,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: { 
          max: 5, 
          min: 0, 
          acquire: 30000, 
          idle: 10000,
          evict: 1000
        },
        dialectOptions: {
          connectTimeout: 10000,
          ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
          } : false
        },
        define: { timestamps: true, underscored: true, freezeTableName: true },
        retry: {
          max: 3,
          match: [
            /ECONNREFUSED/,
            /ETIMEDOUT/,
            /ENOTFOUND/,
            /SequelizeConnectionError/
          ]
        }
      };
      
      sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, sequelizeConfig);
    }
    
    sequelizeInitialized = true;
    return sequelize;
  } catch (error) {
    sequelizeInitialized = true; // Mark as attempted
    if (error.message.includes('mysql2') || error.code === 'MODULE_NOT_FOUND') {
      console.warn('⚠️  mysql2 package not found. Database features will be unavailable.');
      console.warn('   Install with: npm install mysql2');
      console.warn('   For Vercel: Ensure mysql2 is in root package.json dependencies');
      return null; // Return null instead of throwing
    }
    throw error;
  }
}

// Export a Proxy that lazy-initializes on property access
// This allows require() to work without crashing if mysql2 isn't available
module.exports = new Proxy({}, {
  get(target, prop) {
    // Special properties
    if (prop === 'initialize') {
      return initializeSequelize;
    }
    
    // Try to get the sequelize instance
    const db = initializeSequelize();
    if (!db) {
      // If db is null, create a mock that throws helpful errors
      if (prop === 'authenticate') {
        return () => Promise.reject(new Error('Database not available. mysql2 package missing.'));
      }
      throw new Error(`Database not available. Cannot access ${prop}. mysql2 package may be missing.`);
    }
    
    // Bind methods to the db instance
    const value = db[prop];
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
  },
  has(target, prop) {
    const db = initializeSequelize();
    if (!db) return prop === 'initialize';
    return prop in db || prop === 'initialize';
  }
});

// Test connection only in non-serverless, non-test environments
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.RUN_SERVER !== 'false') {
  setTimeout(() => {
    try {
      const db = initializeSequelize();
      if (db) {
        db.authenticate()
          .then(() => {
            console.log('✅ Database connection established successfully');
            console.log(`📊 Connected to: ${process.env.DB_NAME} @ ${process.env.DB_HOST || 'localhost'}`);
          })
          .catch(err => {
            console.error('❌ Database connection failed:', err.message);
          });
      }
    } catch (err) {
      // Silently handle mysql2 missing
    }
  }, 100);
} else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  console.log('📦 Serverless environment detected - database connections will be made on-demand');
}
