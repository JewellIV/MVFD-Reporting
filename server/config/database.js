const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

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
  // For cPanel: Try localhost first if external hostname fails
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 3306;
  
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
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
      // For remote MySQL connections
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    },
    define: { timestamps: true, underscored: true, freezeTableName: true },
    // Retry connection on failure
    retry: {
      max: 3,
      match: [
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ENOTFOUND/,
        /SequelizeConnectionError/
      ]
    }
  });
}

// Test connection and log helpful error messages
if (process.env.NODE_ENV !== 'test') {
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connection established successfully');
      console.log(`📊 Connected to: ${process.env.DB_NAME} @ ${process.env.DB_HOST || 'localhost'}`);
    })
    .catch(err => {
      console.error('❌ Database connection failed:', err.message);
      if (err.message.includes('ENOTFOUND')) {
        console.error('\n💡 TROUBLESHOOTING:');
        console.error('   The database hostname cannot be resolved.');
        console.error('   For cPanel hosting, try one of these:');
        console.error('   1. Use "localhost" if MySQL is on the same server');
        console.error('   2. Use the database server IP address');
        console.error('   3. Check cPanel → MySQL Databases for the correct hostname');
        console.error('   4. The hostname might only be accessible from the same network');
      } else if (err.message.includes('ECONNREFUSED')) {
        console.error('\n💡 TROUBLESHOOTING:');
        console.error('   Connection refused. Check:');
        console.error('   1. MySQL server is running');
        console.error('   2. Port number is correct (usually 3306)');
        console.error('   3. Firewall allows connections');
      } else if (err.message.includes('Access denied')) {
        console.error('\n💡 TROUBLESHOOTING:');
        console.error('   Authentication failed. Check:');
        console.error('   1. Database username and password are correct');
        console.error('   2. User has permissions to access the database');
        console.error('   3. User is allowed to connect from your server IP');
      }
      // Don't exit - let the app continue and try to reconnect later
    });
}

module.exports = sequelize;
