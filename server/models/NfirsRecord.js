const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NfirsRecord = sequelize.define('NfirsRecord', {
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
  incidentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  basic: {
    type: DataTypes.JSON
  },
  fire: {
    type: DataTypes.JSON
  },
  structureFire: {
    type: DataTypes.JSON
  },
  civilianCasualty: {
    type: DataTypes.JSON
  },
  fireServiceCasualty: {
    type: DataTypes.JSON
  },
  hazmat: {
    type: DataTypes.JSON
  },
  wildland: {
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
  tableName: 'nfirs_records'
});

module.exports = NfirsRecord;
