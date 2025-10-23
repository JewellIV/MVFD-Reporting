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
  // NEMSIS 3.5 Response elements
  response: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Response data (eResponse.01-15)'
  },
  // NEMSIS 3.5 Times elements
  times: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Times data (eTimes.01-10)'
  },
  // NEMSIS 3.5 Patient elements
  patient: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Patient data (ePatient.01-15)'
  },
  // NEMSIS 3.5 Clinical elements
  clinical: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Clinical data (eClinical.01-10)'
  },
  // NEMSIS 3.5 Disposition elements (including new v3.5 elements)
  disposition: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Disposition data (eDisposition.01-30)'
  },
  // NEMSIS 3.5 Transport elements
  transport: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Transport data (eTransport.01-07)'
  },
  // NEMSIS 3.5 Crew elements
  crew: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Crew data (eCrew.01-05)'
  },
  // NEMSIS 3.5 Vehicle elements
  vehicle: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Vehicle data (eVehicle.01-05)'
  },
  // NEMSIS 3.5 Vital Signs elements
  vitalSigns: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Vital Signs data (eVital.01-08)'
  },
  // NEMSIS 3.5 Medication elements
  medication: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Medication data (eMedication.01-05)'
  },
  // NEMSIS 3.5 Procedure elements
  procedure: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Procedure data (eProcedure.01-05)'
  },
  // NEMSIS 3.5 Injury elements
  injury: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Injury data (eInjury.01-05)'
  },
  // NEMSIS 3.5 Outcome elements
  outcome: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 Outcome data (eOutcome.01-05)'
  },
  // Data quality and validation
  quality: {
    type: DataTypes.JSON,
    comment: 'Data quality metrics and validation results'
  },
  // NEMSIS 3.5 compliance status
  nemsisVersion: {
    type: DataTypes.STRING(10),
    defaultValue: '3.5',
    comment: 'NEMSIS version compliance'
  },
  complianceStatus: {
    type: DataTypes.ENUM('Compliant', 'Non-Compliant', 'Pending Review'),
    defaultValue: 'Pending Review',
    comment: 'NEMSIS 3.5 compliance status'
  },
  validationResults: {
    type: DataTypes.JSON,
    comment: 'NEMSIS 3.5 validation results and errors'
  },
  // Audit fields
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
  },
  // NEMSIS 3.5 specific fields
  stateSubmission: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether record has been submitted to state'
  },
  federalSubmission: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether record has been submitted to federal'
  },
  submissionDate: {
    type: DataTypes.DATE,
    comment: 'Date of NEMSIS submission'
  }
}, {
  tableName: 'nemsis_records',
  indexes: [
    {
      fields: ['recordId']
    },
    {
      fields: ['agencyNumber']
    },
    {
      fields: ['incidentNumber']
    },
    {
      fields: ['nemsisVersion']
    },
    {
      fields: ['complianceStatus']
    },
    {
      fields: ['createdBy']
    }
  ]
});

module.exports = NemsisRecord;
