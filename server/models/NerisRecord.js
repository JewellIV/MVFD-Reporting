const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NerisRecord = sequelize.define('NerisRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  core: {
    type: DataTypes.JSON
  },
  location: {
    type: DataTypes.JSON
  },
  dispatch: {
    type: DataTypes.JSON
  },
  fire: {
    type: DataTypes.JSON
  },
  medical: {
    type: DataTypes.JSON
  },
  hazard: {
    type: DataTypes.JSON
  },
  rescue: {
    type: DataTypes.JSON
  },
  exposure: {
    type: DataTypes.JSON
  },
  unitResponse: {
    type: DataTypes.JSON
  },
  weather: {
    type: DataTypes.JSON
  },
  augmentation: {
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
  tableName: 'neris_records'
});

module.exports = NerisRecord;
