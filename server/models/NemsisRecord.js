const mongoose = require('mongoose');

const nemsisSchema = new mongoose.Schema({
  // Record Header Information
  recordId: {
    type: String,
    required: true,
    unique: true
  },
  agencyId: {
    type: String,
    required: true
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  
  // Patient Information
  patient: {
    demographics: {
      age: Number,
      ageUnits: {
        type: String,
        enum: ['Years', 'Months', 'Weeks', 'Days', 'Hours', 'Minutes']
      },
      gender: {
        type: String,
        enum: ['M', 'F', 'U']
      },
      race: [String],
      ethnicity: String,
      weight: Number,
      weightUnits: {
        type: String,
        enum: ['Pounds', 'Kilograms']
      }
    },
    identifiers: {
      patientId: String,
      socialSecurityNumber: String,
      driversLicenseNumber: String,
      medicalRecordNumber: String
    }
  },

  // Incident Information
  incident: {
    incidentNumber: {
      type: String,
      required: true
    },
    incidentDate: {
      type: Date,
      required: true
    },
    incidentType: {
      type: String,
      required: true
    },
    location: {
      address: String,
      city: String,
      state: String,
      zipCode: String,
      county: String,
      latitude: Number,
      longitude: Number
    },
    responseMode: {
      type: String,
      enum: ['Emergency', 'Non-Emergency', 'Standby', 'Mutual Aid']
    },
    dispatchTime: Date,
    enRouteTime: Date,
    arrivalTime: Date,
    clearTime: Date
  },

  // Crew Information
  crew: [{
    memberId: String,
    role: {
      type: String,
      enum: ['Driver', 'Officer', 'Firefighter', 'EMT', 'Paramedic', 'Chief']
    },
    certificationLevel: String,
    startTime: Date,
    endTime: Date
  }],

  // Clinical Information
  clinical: {
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
    assessment: {
      primaryAssessment: String,
      secondaryAssessment: String,
      differentialDiagnosis: [String]
    }
  },

  // Transport Information
  transport: {
    transportMode: {
      type: String,
      enum: ['Ground', 'Air', 'Water', 'Other']
    },
    destination: {
      name: String,
      type: {
        type: String,
        enum: ['Hospital', 'Clinic', 'Home', 'Other']
      },
      address: String
    },
    transportTime: Date,
    arrivalTime: Date,
    patientDisposition: {
      type: String,
      enum: ['Treated and Released', 'Transferred', 'Admitted', 'Deceased', 'Refused Care']
    }
  },

  // Quality Assurance
  quality: {
    dataCompleteness: Number, // Percentage
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

// Indexes for better performance
nemsisSchema.index({ recordId: 1 });
nemsisSchema.index({ 'incident.incidentNumber': 1 });
nemsisSchema.index({ 'incident.incidentDate': 1 });
nemsisSchema.index({ createdBy: 1 });
nemsisSchema.index({ syncStatus: 1 });

module.exports = mongoose.model('NemsisRecord', nemsisSchema);