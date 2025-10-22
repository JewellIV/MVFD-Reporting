const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NemsisRecord = sequelize.define('NemsisRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recordId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  agencyNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  incidentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  response: {
    type: DataTypes.JSON
  },
  times: {
    type: DataTypes.JSON
  },
  patient: {
    type: DataTypes.JSON
  },
  clinical: {
    type: DataTypes.JSON
  },
  disposition: {
    type: DataTypes.JSON
  },
  transport: {
    type: DataTypes.JSON
  },
  quality: {
    type: DataTypes.JSON
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lastModifiedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isOffline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  syncStatus: {
    type: DataTypes.ENUM('Pending', 'Synced', 'Error'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'nemsis_records'
});

module.exports = NemsisRecord;
