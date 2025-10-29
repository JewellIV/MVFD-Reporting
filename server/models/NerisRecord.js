const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NerisRecord = sequelize.define('NerisRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Core incident data
  incident_neris_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    comment: 'Unique NERIS identifier: Entity NERIS ID + epoch milliseconds'
  },
  incident_internal_id: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Department internal incident ID'
  },
  incident_final_type: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Final incident type(s) - value_1, value_2, value_3, primary flag'
  },
  incident_special_modifier: {
    type: DataTypes.JSON,
    comment: 'Special incident modifiers'
  },
  incident_point: {
    type: DataTypes.GEOMETRY('POINT'),
    allowNull: false,
    comment: 'WGS84 lat/lng of incident'
  },
  incident_polygon: {
    type: DataTypes.GEOMETRY('POLYGON'),
    comment: 'WGS84 polygon of incident footprint'
  },
  incident_location: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Civic location following NENA CLDXF standard'
  },
  incident_location_use: {
    type: DataTypes.JSON,
    comment: 'Location use classification'
  },
  incident_people_present: {
    type: DataTypes.BOOLEAN,
    comment: 'Whether people were present at incident'
  },
  incident_displaced_number: {
    type: DataTypes.INTEGER,
    comment: 'Number of people displaced'
  },
  incident_displaced_cause: {
    type: DataTypes.JSON,
    comment: 'Cause for displacement'
  },
  incident_rescue_animal: {
    type: DataTypes.INTEGER,
    comment: 'Number of animals rescued'
  },
  incident_actions_taken: {
    type: DataTypes.JSON,
    comment: 'Actions and tactics taken by fire department'
  },
  incident_noaction: {
    type: DataTypes.STRING(255),
    comment: 'Reason no action taken'
  },
  incident_aid_direction: {
    type: DataTypes.STRING(255),
    comment: 'Whether aid was given or received'
  },
  incident_aid_type: {
    type: DataTypes.STRING(255),
    comment: 'Type of aid given or received'
  },
  incident_aid_department_name: {
    type: DataTypes.JSON,
    comment: 'Fire department names for aid'
  },
  incident_aid_nonfd: {
    type: DataTypes.JSON,
    comment: 'Non-fire department entities providing/receiving aid'
  },
  incident_narrative_impediment: {
    type: DataTypes.TEXT,
    comment: 'Description of obstacles that impacted the incident'
  },
  incident_narrative_outcome: {
    type: DataTypes.TEXT,
    comment: 'Description of final disposition of the incident'
  },
  // Module-specific data
  dispatch: {
    type: DataTypes.JSON,
    comment: 'Dispatch module data'
  },
  fire: {
    type: DataTypes.JSON,
    comment: 'Fire incident module data'
  },
  medical: {
    type: DataTypes.JSON,
    comment: 'Medical incident module data (array)'
  },
  hazard: {
    type: DataTypes.JSON,
    comment: 'Hazard incident module data'
  },
  emerging_hazard: {
    type: DataTypes.JSON,
    comment: 'Emerging hazard module data'
  },
  exposure: {
    type: DataTypes.JSON,
    comment: 'Exposure module data'
  },
  rescue_ff: {
    type: DataTypes.JSON,
    comment: 'Firefighter rescue/casualty module'
  },
  rescue_nonff: {
    type: DataTypes.JSON,
    comment: 'Non-firefighter rescue/casualty module'
  },
  risk_reduction: {
    type: DataTypes.JSON,
    comment: 'Risk reduction module data'
  },
  unit_response: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Unit response module data (array)'
  },
  // Augmentation data
  parcel: {
    type: DataTypes.JSON,
    comment: 'Parcel data (augmented)'
  },
  weather: {
    type: DataTypes.JSON,
    comment: 'Weather data (augmented)'
  },
  // Quality and submission tracking
  quality: {
    type: DataTypes.JSON,
    defaultValue: {
      status: 'Draft',
      score: 0,
      errors: [],
      warnings: []
    }
  },
  submission_status: {
    type: DataTypes.ENUM('Draft', 'Pending Review', 'Approved', 'Rejected', 'Submitted to NERIS'),
    defaultValue: 'Draft'
  },
  submitted_to_neris: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  neris_submission_date: {
    type: DataTypes.DATE,
    comment: 'Date/time record was submitted to NERIS'
  },
  neris_submission_id: {
    type: DataTypes.STRING(255),
    comment: 'NERIS API submission ID'
  },
  // Auditing
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
  tableName: 'neris_records',
  indexes: [
    { fields: ['incident_neris_id'], unique: true },
    { fields: ['incident_internal_id'] },
    { fields: ['submission_status'] },
    { fields: ['createdBy'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = NerisRecord;
