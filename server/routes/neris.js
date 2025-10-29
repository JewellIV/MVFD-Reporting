const express = require('express');
const { body, validationResult } = require('express-validator');
const NerisRecord = require('../models/NerisRecord');
const { auth, requireRole } = require('../middleware/auth');
const VDFPIntegration = require('../services/virginia/VDFPIntegration');
const NerisValidator = require('../services/neris/NerisValidator');
const NerisSchemaService = require('../services/neris/NerisSchemaService');
const DispatchCodeMappingService = require('../services/neris/DispatchCodeMappingService');

const router = express.Router();

// Initialize services
router.use(async (req, res, next) => {
  try {
    await NerisSchemaService.initialize();
    next();
  } catch (error) {
    console.error('Failed to initialize NERIS services:', error);
    next(error);
  }
});

// Get all NERIS records
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, incidentType } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query['quality.status'] = status;
    if (incidentType) query['core.incidentTypes'] = incidentType;
    if (startDate || endDate) {
      query['core.incidentDate'] = {};
      if (startDate) query['core.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['core.incidentDate'].$lte = new Date(endDate);
    }

    const records = await NerisRecord.find(query)
      .sort({ 'core.incidentDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const total = await NerisRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get NERIS records error:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

// Get single NERIS record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id)
      .populate('createdBy', 'firstName lastName badgeNumber')
      .populate('lastModifiedBy', 'firstName lastName badgeNumber');

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check if user has access to this record
    if (record.createdBy._id.toString() !== req.user._id.toString() && 
        !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get NERIS record error:', error);
    res.status(500).json({ error: 'Server error fetching record' });
  }
});

// Get incident types
router.get('/incident-types', auth, async (req, res) => {
  try {
    const incidentTypes = NerisSchemaService.getIncidentTypes();
    res.json(incidentTypes);
  } catch (error) {
    console.error('Get incident types error:', error);
    res.status(500).json({ error: 'Server error fetching incident types' });
  }
});

// Get schema fields for a module
router.get('/schema/:moduleType/:moduleName', auth, async (req, res) => {
  try {
    const { moduleType, moduleName } = req.params;
    const module = NerisSchemaService.getModule(moduleType, moduleName);
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json(module);
  } catch (error) {
    console.error('Get schema error:', error);
    res.status(500).json({ error: 'Server error fetching schema' });
  }
});

// Get value set
router.get('/value-set/:setName', auth, async (req, res) => {
  try {
    const { setName } = req.params;
    const valueSet = NerisSchemaService.getValueSet(setName);
    
    if (!valueSet || valueSet.length === 0) {
      return res.status(404).json({ error: 'Value set not found' });
    }
    
    res.json(valueSet);
  } catch (error) {
    console.error('Get value set error:', error);
    res.status(500).json({ error: 'Server error fetching value set' });
  }
});

// Create new NERIS record
router.post('/', auth, [
  body('incident_internal_id').notEmpty().withMessage('Internal incident ID is required'),
  body('incident_final_type').isArray().withMessage('Incident types must be an array'),
  body('incident_location').isObject().withMessage('Incident location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generate NERIS ID if not provided
    if (!req.body.incident_neris_id) {
      const timestamp = Date.now();
      const departmentId = 'FD12029001'; // Mango Hick VFD
      req.body.incident_neris_id = `${departmentId}:${timestamp}`;
    }

    // Check if incident already exists
    const existingRecord = await NerisRecord.findOne({ 
      incident_internal_id: req.body.incident_internal_id 
    });

    if (existingRecord) {
      return res.status(400).json({ error: 'Incident with this internal ID already exists' });
    }

    // Validate the record
    const validator = new NerisValidator();
    await validator.initialize();
    const validation = await validator.validate(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        validation
      });
    }

    const recordData = {
      ...req.body,
      quality: {
        score: validation.score,
        errors: validation.errors,
        warnings: validation.warnings
      },
      createdBy: req.user.id
    };

    const record = await NerisRecord.create(recordData);

    res.status(201).json(record);
  } catch (error) {
    console.error('Create NERIS record error:', error);
    res.status(500).json({ error: 'Server error creating record' });
  }
});

// Update NERIS record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check if user has access to this record
    if (record.createdBy.toString() !== req.user._id.toString() && 
        !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update record
    Object.assign(record, req.body);
    record.lastModifiedBy = req.user._id;
    record.version += 1;

    await record.save();

    res.json(record);
  } catch (error) {
    console.error('Update NERIS record error:', error);
    res.status(500).json({ error: 'Server error updating record' });
  }
});

// Delete NERIS record
router.delete('/:id', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await NerisRecord.findByIdAndDelete(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete NERIS record error:', error);
    res.status(500).json({ error: 'Server error deleting record' });
  }
});

// Submit record for review
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    record.quality.status = 'Pending Review';
    record.lastModifiedBy = req.user._id;
    await record.save();

    res.json({ message: 'Record submitted for review', record });
  } catch (error) {
    console.error('Submit NERIS record error:', error);
    res.status(500).json({ error: 'Server error submitting record' });
  }
});

// Approve/reject record
router.post('/:id/review', auth, requireRole(['admin', 'officer']), [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('comments').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, comments } = req.body;
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    record.quality.status = action === 'approve' ? 'Approved' : 'Rejected';
    record.quality.reviewedBy = req.user._id;
    record.quality.reviewDate = new Date();
    record.lastModifiedBy = req.user._id;

    if (comments) {
      record.quality.comments = comments;
    }

    await record.save();

    res.json({ message: `Record ${action}d successfully`, record });
  } catch (error) {
    console.error('Review NERIS record error:', error);
    res.status(500).json({ error: 'Server error reviewing record' });
  }
});

// Validate NERIS record
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const record = await NerisRecord.findByPk(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    // Run validation
    const validator = new NerisValidator();
    await validator.initialize();
    const validation = await validator.validate(record.toJSON());
    
    // Update quality score
    await record.update({
      quality: {
        score: validation.score,
        errors: validation.errors,
        warnings: validation.warnings
      }
    });
    
    res.json(validation);
  } catch (error) {
    console.error('Validate NERIS record error:', error);
    res.status(500).json({ error: 'Server error validating record' });
  }
});

// Submit to VDFP
router.post('/:id/submit-vdfp', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NerisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.quality.status !== 'Approved') {
      return res.status(400).json({ error: 'Record must be approved before submission' });
    }

    const vdfpIntegration = new VDFPIntegration();
    const result = await vdfpIntegration.submitNerisRecord(record.toObject());

    if (result.success) {
      record.syncStatus = 'Synced';
      record.lastModifiedBy = req.user._id;
      await record.save();
    }

    res.json(result);
  } catch (error) {
    console.error('VDFP submission error:', error);
    res.status(500).json({ error: 'Server error submitting to VDFP' });
  }
});

// Get GIS data for location
router.get('/gis/location/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // This would integrate with your GIS service
    // For now, return mock data
    const gisData = {
      address: {
        streetNumber: '123',
        streetName: 'Main St',
        streetType: 'Street',
        city: 'Richmond',
        state: 'VA',
        zipCode: '23219',
        country: 'US'
      },
      parcel: {
        parcelId: 'PARCEL-' + Math.random().toString(36).substr(2, 9),
        owner: 'Property Owner',
        propertyType: 'Residential',
        landUse: 'Single Family',
        buildingValue: 250000,
        landValue: 50000,
        totalValue: 300000,
        yearBuilt: 1995,
        squareFootage: 2000,
        stories: 2
      },
      census: {
        tract: '1234.56',
        blockGroup: '1',
        block: '1234',
        county: 'Richmond City',
        state: 'VA'
      }
    };

    res.json(gisData);
  } catch (error) {
    console.error('GIS data error:', error);
    res.status(500).json({ error: 'Server error fetching GIS data' });
  }
});

// Get weather data for location
router.get('/weather/:lat/:lng', auth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // This would integrate with National Weather Service API
    // For now, return mock data
    const weatherData = {
      temperature: 72,
      temperatureUnit: 'F',
      windSpeed: '10 mph',
      windDirection: 'NW',
      shortForecast: 'Partly Cloudy',
      detailedForecast: 'Partly cloudy with a chance of rain',
      icon: 'https://api.weather.gov/icons/land/day/sct',
      timestamp: new Date().toISOString()
    };

    res.json(weatherData);
  } catch (error) {
    console.error('Weather data error:', error);
    res.status(500).json({ error: 'Server error fetching weather data' });
  }
});

// Export NERIS data
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, status } = req.query;

    const query = {};
    if (startDate || endDate) {
      query['core.incidentDate'] = {};
      if (startDate) query['core.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['core.incidentDate'].$lte = new Date(endDate);
    }
    if (status) query['quality.status'] = status;

    const records = await NerisRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    if (format === 'xml') {
      // Convert to NERIS XML format
      const xml = convertToNerisXML(records);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="neris-export.xml"');
      res.send(xml);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="neris-export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use xml or csv' });
    }
  } catch (error) {
    console.error('Export NERIS data error:', error);
    res.status(500).json({ error: 'Server error exporting data' });
  }
});

// Helper function to convert records to NERIS XML format
function convertToNerisXML(records) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NERISDataSet>\n';
  
  records.forEach(record => {
    xml += '  <Incident>\n';
    xml += `    <IncidentNumber>${record.core.incidentNumber}</IncidentNumber>\n`;
    xml += `    <IncidentDate>${record.core.incidentDate.toISOString()}</IncidentDate>\n`;
    xml += `    <IncidentTypes>${record.core.incidentTypes.join(',')}</IncidentTypes>\n`;
    xml += `    <Latitude>${record.location.coordinates.latitude}</Latitude>\n`;
    xml += `    <Longitude>${record.location.coordinates.longitude}</Longitude>\n`;
    // Add more fields as needed
    xml += '  </Incident>\n';
  });
  
  xml += '</NERISDataSet>';
  return xml;
}

// Helper function to convert records to CSV format
function convertToCSV(records) {
  const headers = [
    'IncidentNumber', 'IncidentDate', 'IncidentTypes', 'Latitude', 'Longitude',
    'Address', 'City', 'State', 'ZipCode', 'Status'
  ];
  
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = [
      record.core.incidentNumber,
      record.core.incidentDate.toISOString(),
      record.core.incidentTypes.join(';'),
      record.location.coordinates.latitude,
      record.location.coordinates.longitude,
      record.location.address?.streetName || '',
      record.location.address?.city || '',
      record.location.address?.state || '',
      record.location.address?.zipCode || '',
      record.quality.status || ''
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

// Dispatch code mapping endpoints
router.get('/dispatch-mappings', auth, async (req, res) => {
  try {
    const departmentId = req.query.departmentId || req.user.departmentId;
    const mappings = await DispatchCodeMappingService.getAllDispatchCodes(departmentId);
    res.json(mappings);
  } catch (error) {
    console.error('Get dispatch mappings error:', error);
    res.status(500).json({ error: 'Server error fetching dispatch mappings' });
  }
});

router.post('/dispatch-mappings', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { dispatch_code, incident_type } = req.body;
    const departmentId = req.user.departmentId;
    
    await DispatchCodeMappingService.addMapping(departmentId, dispatch_code, incident_type);
    
    res.json({ message: 'Dispatch code mapping added successfully' });
  } catch (error) {
    console.error('Add dispatch mapping error:', error);
    res.status(500).json({ error: 'Server error adding dispatch mapping' });
  }
});

router.delete('/dispatch-mappings/:dispatchCode', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { dispatchCode } = req.params;
    const departmentId = req.user.departmentId;
    
    await DispatchCodeMappingService.deleteMapping(departmentId, dispatchCode);
    
    res.json({ message: 'Dispatch code mapping deleted successfully' });
  } catch (error) {
    console.error('Delete dispatch mapping error:', error);
    res.status(500).json({ error: 'Server error deleting dispatch mapping' });
  }
});

router.get('/dispatch-mappings/template', auth, async (req, res) => {
  try {
    const template = DispatchCodeMappingService.getTemplate();
    res.json(template);
  } catch (error) {
    console.error('Get dispatch mapping template error:', error);
    res.status(500).json({ error: 'Server error fetching template' });
  }
});

module.exports = router;