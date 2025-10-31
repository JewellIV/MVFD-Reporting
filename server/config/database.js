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
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
}

module.exports = sequelize;
