const mongoose = require('mongoose');

const nfirsSchema = new mongoose.Schema({
  // Basic Incident Information
  incidentNumber: {
    type: String,
    required: true,
    unique: true
  },
  incidentDate: {
    type: Date,
    required: true
  },
  alarmTime: Date,
  arrivalTime: Date,
  controlledTime: Date,
  lastUnitClearedTime: Date,
  
  // Location Information
  location: {
    address: String,
    city: String,
    state: {
      type: String,
      default: 'VA'
    },
    zipCode: String,
    county: String,
    latitude: Number,
    longitude: Number,
    censusTract: String,
    fireDistrict: String
  },

  // Incident Type and Classification
  incidentType: {
    type: String,
    required: true
  },
  incidentTypeCode: String,
  actionTaken: [String],
  suppressionApparatus: [{
    apparatusId: String,
    apparatusType: String,
    responseTime: Number,
    arrivalTime: Date
  }],

  // Fire Information
  fire: {
    fireSpread: String,
    flameHeight: String,
    heatLevel: String,
    smokeColor: String,
    smokeDensity: String,
    windDirection: String,
    windSpeed: Number,
    weatherConditions: String,
    temperature: Number,
    humidity: Number
  },

  // Property Information
  property: {
    propertyUse: String,
    propertyUseCode: String,
    structureType: String,
    structureStatus: String,
    constructionType: String,
    stories: Number,
    squareFootage: Number,
    yearBuilt: Number,
    sprinklerSystem: Boolean,
    smokeDetector: Boolean,
    alarmSystem: Boolean
  },

  // Loss Information
  loss: {
    propertyLoss: Number,
    contentLoss: Number,
    totalLoss: Number,
    propertyValue: Number,
    contentValue: Number,
    totalValue: Number,
    lossOfLife: {
      civilian: Number,
      firefighter: Number
    },
    injuries: {
      civilian: Number,
      firefighter: Number
    }
  },

  // Cause Information
  cause: {
    cause: String,
    causeCode: String,
    humanFactor: String,
    equipmentInvolved: String,
    factorContributing: [String],
    investigationStatus: String,
    investigator: String
  },

  // Personnel Information
  personnel: [{
    memberId: String,
    name: String,
    rank: String,
    assignment: String,
    timeOnScene: Number,
    injuries: Boolean,
    injuryDescription: String
  }],

  // Apparatus Information
  apparatus: [{
    apparatusId: String,
    apparatusType: String,
    responseTime: Number,
    arrivalTime: Date,
    clearTime: Date,
    mileage: Number,
    fuelUsed: Number
  }],

  // Mutual Aid
  mutualAid: [{
    department: String,
    apparatus: String,
    personnel: Number,
    responseTime: Number
  }],

  // Narrative
  narrative: {
    incidentDescription: String,
    actionsTaken: String,
    specialCircumstances: String,
    lessonsLearned: String
  },

  // Quality Assurance
  quality: {
    dataCompleteness: Number,
    validationErrors: [String],
    reviewedBy: String,
    reviewDate: Date,
    status: {
      type: String,
      enum: ['Draft', 'Pending Review', 'Approved', 'Rejected'],
      default: 'Draft'
    }
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  isOffline: {
    type: Boolean,
    default: false
  },
  syncStatus: {
    type: String,
    enum: ['Pending', 'Synced', 'Error'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

// Indexes
nfirsSchema.index({ incidentNumber: 1 });
nfirsSchema.index({ incidentDate: 1 });
nfirsSchema.index({ createdBy: 1 });
nfirsSchema.index({ syncStatus: 1 });

module.exports = mongoose.model('NfirsRecord', nfirsSchema);