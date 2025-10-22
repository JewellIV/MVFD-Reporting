const mongoose = require('mongoose');

// NERIS-native GIS-centric data model
const nerisSchema = new mongoose.Schema({
  // Core Incident Information (NERIS Core Module)
  core: {
    incidentNumber: {
      type: String,
      required: true,
      unique: true
    },
    incidentDate: {
      type: Date,
      required: true
    },
    incidentTypes: [{
      type: String,
      required: true
    }], // Up to 3 incident types per event
    incidentStatus: {
      type: String,
      enum: ['Active', 'Controlled', 'Closed'],
      default: 'Active'
    },
    incidentPriority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    }
  },

  // GIS Foundation (Location Module)
  location: {
    // Primary location
    address: {
      streetNumber: String,
      streetName: String,
      streetType: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    // Geographic coordinates (required for NERIS)
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      },
      accuracy: Number, // GPS accuracy in meters
      altitude: Number,
      altitudeAccuracy: Number
    },
    // Geocoding information
    geocoding: {
      source: String, // e.g., 'Google Maps', 'ArcGIS', 'Manual'
      confidence: Number, // 0-100
      timestamp: Date,
      addressComponents: {
        streetNumber: String,
        route: String,
        locality: String,
        administrativeAreaLevel1: String,
        administrativeAreaLevel2: String,
        country: String,
        postalCode: String
      }
    },
    // Parcel information
    parcel: {
      parcelId: String,
      owner: String,
      propertyType: String,
      landUse: String,
      buildingValue: Number,
      landValue: Number,
      totalValue: Number,
      yearBuilt: Number,
      squareFootage: Number,
      stories: Number
    },
    // Census information
    census: {
      tract: String,
      blockGroup: String,
      block: String,
      county: String,
      state: String
    }
  },

  // Dispatch Module
  dispatch: {
    dispatchTime: Date,
    dispatchSource: {
      type: String,
      enum: ['911', 'Direct', 'Mutual Aid', 'Other']
    },
    dispatchCenter: String,
    dispatchPersonnel: String,
    initialCallType: String,
    priority: String,
    responseMode: {
      type: String,
      enum: ['Emergency', 'Non-Emergency', 'Standby', 'Mutual Aid']
    }
  },

  // Fire Module (for fire incidents)
  fire: {
    fireSpread: {
      type: String,
      enum: ['Confined', 'Limited', 'Major', 'Conflagration']
    },
    flameHeight: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Very High']
    },
    heatLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Very High']
    },
    smokeColor: {
      type: String,
      enum: ['White', 'Gray', 'Black', 'Brown', 'Yellow', 'Other']
    },
    smokeDensity: {
      type: String,
      enum: ['Light', 'Medium', 'Heavy', 'Very Heavy']
    },
    windDirection: String,
    windSpeed: Number,
    weatherConditions: String,
    temperature: Number,
    humidity: Number,
    // Operational tactics
    tactics: {
      suppression: [{
        method: String,
        startTime: Date,
        endTime: Date,
        effectiveness: String
      }],
      ventilation: [{
        method: String,
        startTime: Date,
        endTime: Date,
        effectiveness: String
      }],
      search: [{
        area: String,
        startTime: Date,
        endTime: Date,
        victimsFound: Number
      }],
      rescue: [{
        method: String,
        startTime: Date,
        endTime: Date,
        victimsRescued: Number
      }]
    },
    // Contamination reduction
    contamination: {
      decontaminationPerformed: Boolean,
      decontaminationMethod: String,
      personnelDecontaminated: Number,
      equipmentDecontaminated: Number
    }
  },

  // Medical Module (for EMS incidents)
  medical: {
    patientCount: Number,
    patients: [{
      patientId: String,
      age: Number,
      ageUnits: String,
      gender: String,
      race: String,
      ethnicity: String,
      chiefComplaint: String,
      primaryImpression: String,
      secondaryImpression: [String],
      vitalSigns: [{
        timestamp: Date,
        bloodPressure: {
          systolic: Number,
          diastolic: Number
        },
        heartRate: Number,
        respiratoryRate: Number,
        temperature: Number,
        oxygenSaturation: Number,
        painScale: Number
      }],
      medications: [{
        name: String,
        dosage: String,
        route: String,
        timeGiven: Date
      }],
      procedures: [{
        procedure: String,
        timePerformed: Date,
        success: Boolean,
        complications: String
      }],
      transport: {
        mode: String,
        destination: String,
        disposition: String
      }
    }]
  },

  // Hazard Module (for hazmat incidents)
  hazard: {
    hazmatInvolved: Boolean,
    hazmatClass: String,
    hazmatSubclass: String,
    hazmatName: String,
    hazmatQuantity: String,
    hazmatUnits: String,
    hazmatContainer: String,
    hazmatRelease: Boolean,
    hazmatReleaseQuantity: String,
    hazmatReleaseUnits: String,
    hazmatReleaseRate: String,
    hazmatReleaseRateUnits: String,
    hazmatReleaseDuration: String,
    hazmatReleaseDurationUnits: String,
    hazmatReleaseArea: String,
    hazmatReleaseAreaUnits: String,
    hazmatReleaseVolume: String,
    hazmatReleaseVolumeUnits: String,
    hazmatReleaseWeight: String,
    hazmatReleaseWeightUnits: String,
    hazmatReleasePressure: String,
    hazmatReleasePressureUnits: String,
    hazmatReleaseTemperature: String,
    hazmatReleaseTemperatureUnits: String,
    hazmatReleaseDensity: String,
    hazmatReleaseDensityUnits: String,
    hazmatReleaseViscosity: String,
    hazmatReleaseViscosityUnits: String,
    hazmatReleasepH: String,
    hazmatReleasepHUnits: String,
    hazmatReleaseConcentration: String,
    hazmatReleaseConcentrationUnits: String,
    hazmatReleasePurity: String,
    hazmatReleasePurityUnits: String,
    hazmatReleaseSolubility: String,
    hazmatReleaseSolubilityUnits: String,
    hazmatReleaseStability: String,
    hazmatReleaseStabilityUnits: String,
    hazmatReleaseReactivity: String,
    hazmatReleaseReactivityUnits: String,
    hazmatReleaseToxicity: String,
    hazmatReleaseToxicityUnits: String,
    hazmatReleaseFlammability: String,
    hazmatReleaseFlammabilityUnits: String,
    hazmatReleaseCorrosivity: String,
    hazmatReleaseCorrosivityUnits: String,
    hazmatReleaseOxidizing: String,
    hazmatReleaseOxidizingUnits: String,
    hazmatReleaseReducing: String,
    hazmatReleaseReducingUnits: String,
    hazmatReleaseRadioactive: String,
    hazmatReleaseRadioactiveUnits: String,
    hazmatReleaseBiological: String,
    hazmatReleaseBiologicalUnits: String,
    hazmatReleaseOther: String,
    hazmatReleaseOtherUnits: String
  },

  // Rescue Module (for rescue incidents)
  rescue: {
    rescueType: String,
    rescueMethod: String,
    rescueEquipment: [String],
    rescuePersonnel: Number,
    rescueDuration: Number,
    rescueSuccess: Boolean,
    victimsRescued: Number,
    victimsInjured: Number,
    victimsFatalities: Number
  },

  // Exposure Module (for exposure incidents)
  exposure: {
    exposureType: String,
    exposureSource: String,
    exposureDuration: Number,
    exposureUnits: String,
    exposureLevel: String,
    exposureUnits2: String,
    exposureRoute: String,
    exposureProtection: String,
    exposureSymptoms: [String],
    exposureTreatment: [String],
    exposureFollowUp: String
  },

  // Unit Response Module
  unitResponse: [{
    unitId: String,
    unitType: String,
    unitStatus: String,
    dispatchTime: Date,
    enRouteTime: Date,
    arrivalTime: Date,
    clearTime: Date,
    responseTime: Number,
    travelTime: Number,
    onSceneTime: Number,
    totalTime: Number,
    mileage: Number,
    fuelUsed: Number,
    personnel: [{
      memberId: String,
      name: String,
      role: String,
      certification: String,
      startTime: Date,
      endTime: Date
    }]
  }],

  // Weather Module
  weather: {
    temperature: Number,
    humidity: Number,
    windSpeed: Number,
    windDirection: String,
    visibility: Number,
    precipitation: String,
    cloudCover: String,
    pressure: Number,
    dewPoint: Number,
    heatIndex: Number,
    windChill: Number,
    weatherCondition: String,
    weatherHazard: [String]
  },

  // Augmentation Modules
  augmentation: {
    // Custom fields for specific agency needs
    customFields: Map,
    // Integration with other systems
    externalSystems: [{
      systemName: String,
      systemId: String,
      lastSync: Date
    }]
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
    },
    nerisCompliance: {
      compliant: Boolean,
      errors: [String],
      warnings: [String],
      lastValidated: Date
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

// Geospatial index for GIS queries
nerisSchema.index({ 'location.coordinates': '2dsphere' });

// Text index for search
nerisSchema.index({
  'core.incidentNumber': 'text',
  'core.incidentTypes': 'text',
  'location.address.streetName': 'text',
  'location.address.city': 'text'
});

// Compound indexes for common queries
nerisSchema.index({ 'core.incidentDate': 1, 'core.incidentTypes': 1 });
nerisSchema.index({ 'createdBy': 1, 'core.incidentDate': -1 });
nerisSchema.index({ 'quality.status': 1, 'core.incidentDate': -1 });

// Virtual for full address
nerisSchema.virtual('fullAddress').get(function() {
  const addr = this.location.address;
  if (!addr) return '';
  
  return [
    addr.streetNumber,
    addr.streetName,
    addr.streetType,
    addr.city,
    addr.state,
    addr.zipCode
  ].filter(Boolean).join(' ');
});

// Virtual for incident duration
nerisSchema.virtual('incidentDuration').get(function() {
  if (!this.dispatch.dispatchTime || !this.unitResponse.length) return null;
  
  const lastClearTime = Math.max(...this.unitResponse.map(unit => 
    unit.clearTime ? new Date(unit.clearTime).getTime() : 0
  ));
  
  if (lastClearTime === 0) return null;
  
  return lastClearTime - new Date(this.dispatch.dispatchTime).getTime();
});

// Pre-save middleware to ensure GIS data
nerisSchema.pre('save', function(next) {
  // Ensure coordinates are present
  if (!this.location.coordinates.latitude || !this.location.coordinates.longitude) {
    return next(new Error('Geographic coordinates are required for NERIS compliance'));
  }
  
  // Ensure at least one incident type
  if (!this.core.incidentTypes || this.core.incidentTypes.length === 0) {
    return next(new Error('At least one incident type is required'));
  }
  
  // Limit incident types to 3 (NERIS requirement)
  if (this.core.incidentTypes.length > 3) {
    this.core.incidentTypes = this.core.incidentTypes.slice(0, 3);
  }
  
  next();
});

module.exports = mongoose.model('NerisRecord', nerisSchema);