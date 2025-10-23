const express = require('express');
const { body, validationResult } = require('express-validator');
const NemsisRecord = require('../models/NemsisRecord');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all NEMSIS records
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const query = { createdBy: req.user._id };

    if (status) query['quality.status'] = status;
    if (startDate || endDate) {
      query['incident.incidentDate'] = {};
      if (startDate) query['incident.incidentDate'].$gte = new Date(startDate);
      if (endDate) query['incident.incidentDate'].$lte = new Date(endDate);
    }

    const records = await NemsisRecord.find(query)
      .sort({ 'incident.incidentDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const total = await NemsisRecord.countDocuments(query);

    res.json({
      records,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get NEMSIS records error:', error);
    res.status(500).json({ error: 'Server error fetching records' });
  }
});

// Get single NEMSIS record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id)
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
    console.error('Get NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error fetching record' });
  }
});

// Create new NEMSIS record
router.post('/', auth, [
  // NEMSIS 3.5 Response validation
  body('response.agencyNumber').notEmpty().withMessage('Agency number is required'),
  body('response.incidentNumber').notEmpty().withMessage('Incident number is required'),
  body('response.responseDate').optional().isISO8601().withMessage('Valid response date is required'),
  body('response.incidentType').optional().notEmpty().withMessage('Incident type is required'),
  body('response.responseMode').optional().isIn(['Emergency', 'Non-Emergency', 'Standby']).withMessage('Valid response mode is required'),
  body('response.state').optional().isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters'),
  
  // NEMSIS 3.5 Times validation
  body('times.dispatchTime').optional().isISO8601().withMessage('Valid dispatch time is required'),
  body('times.arrivalTime').optional().isISO8601().withMessage('Valid arrival time is required'),
  
  // NEMSIS 3.5 Patient validation
  body('patient.age').optional().isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
  body('patient.gender').optional().isIn(['M', 'F', 'U']).withMessage('Valid gender is required'),
  body('patient.weight').optional().isFloat({ min: 0, max: 1000 }).withMessage('Weight must be between 0 and 1000 pounds'),
  body('patient.height').optional().isFloat({ min: 0, max: 120 }).withMessage('Height must be between 0 and 120 inches'),
  
  // NEMSIS 3.5 Clinical validation
  body('clinical.chiefComplaint').optional().isLength({ max: 1000 }).withMessage('Chief complaint must not exceed 1000 characters'),
  body('clinical.painScale').optional().isInt({ min: 0, max: 10 }).withMessage('Pain scale must be between 0 and 10'),
  body('clinical.glasgowComaScale').optional().isInt({ min: 3, max: 15 }).withMessage('Glasgow Coma Scale must be between 3 and 15'),
  
  // NEMSIS 3.5 Disposition validation (including new v3.5 elements)
  body('disposition.unitDisposition').optional().notEmpty().withMessage('Unit disposition is required for NEMSIS 3.5'),
  body('disposition.patientEvaluation').optional().notEmpty().withMessage('Patient evaluation is required for NEMSIS 3.5'),
  body('disposition.crewDisposition').optional().notEmpty().withMessage('Crew disposition is required for NEMSIS 3.5'),
  body('disposition.transportDisposition').optional().notEmpty().withMessage('Transport disposition is required for NEMSIS 3.5'),
  
  // NEMSIS 3.5 Vital Signs validation
  body('vitalSigns.systolic').optional().isFloat({ min: 0, max: 300 }).withMessage('Systolic blood pressure must be between 0 and 300 mmHg'),
  body('vitalSigns.diastolic').optional().isFloat({ min: 0, max: 200 }).withMessage('Diastolic blood pressure must be between 0 and 200 mmHg'),
  body('vitalSigns.heartRate').optional().isInt({ min: 0, max: 300 }).withMessage('Heart rate must be between 0 and 300 bpm'),
  body('vitalSigns.respiratoryRate').optional().isInt({ min: 0, max: 100 }).withMessage('Respiratory rate must be between 0 and 100 breaths/min'),
  body('vitalSigns.temperature').optional().isFloat({ min: 80, max: 120 }).withMessage('Temperature must be between 80 and 120 degrees Fahrenheit'),
  body('vitalSigns.oxygenSaturation').optional().isInt({ min: 0, max: 100 }).withMessage('Oxygen saturation must be between 0 and 100%'),
  
  // NEMSIS 3.5 Crew validation
  body('crew.name').optional().notEmpty().withMessage('Crew member name is required'),
  body('crew.role').optional().notEmpty().withMessage('Crew member role is required'),
  
  // NEMSIS 3.5 Vehicle validation
  body('vehicle.unitId').optional().notEmpty().withMessage('Vehicle unit ID is required'),
  body('vehicle.type').optional().notEmpty().withMessage('Vehicle type is required'),
  
  // NEMSIS 3.5 Medication validation
  body('medication.name').optional().notEmpty().withMessage('Medication name is required'),
  body('medication.dose').optional().notEmpty().withMessage('Medication dose is required'),
  body('medication.route').optional().notEmpty().withMessage('Medication route is required'),
  
  // NEMSIS 3.5 Procedure validation
  body('procedure.name').optional().notEmpty().withMessage('Procedure name is required'),
  body('procedure.time').optional().isISO8601().withMessage('Valid procedure time is required'),
  
  // NEMSIS 3.5 Injury validation
  body('injury.type').optional().notEmpty().withMessage('Injury type is required'),
  body('injury.mechanism').optional().notEmpty().withMessage('Injury mechanism is required'),
  
  // NEMSIS 3.5 Outcome validation
  body('outcome.patientOutcome').optional().notEmpty().withMessage('Patient outcome is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Generate unique record ID
    const recordId = `NEMSIS-3.5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const recordData = {
      ...req.body,
      recordId,
      agencyNumber: req.body.response?.agencyNumber || 'MANGOHICK-VFD-001',
      incidentNumber: req.body.response?.incidentNumber || req.body.incident?.incidentNumber,
      nemsisVersion: '3.5',
      complianceStatus: 'Pending Review',
      createdBy: req.user._id
    };

    const record = new NemsisRecord(recordData);
    await record.save();

    res.status(201).json(record);
  } catch (error) {
    console.error('Create NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error creating record' });
  }
});

// Update NEMSIS record
router.put('/:id', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

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
    console.error('Update NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error updating record' });
  }
});

// Delete NEMSIS record
router.delete('/:id', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await NemsisRecord.findByIdAndDelete(req.params.id);

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error deleting record' });
  }
});

// Submit record for review
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

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
    console.error('Submit NEMSIS record error:', error);
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
    const record = await NemsisRecord.findById(req.params.id);

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
    console.error('Review NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error reviewing record' });
  }
});

// Validate NEMSIS 3.5 record
router.post('/:id/validate', auth, async (req, res) => {
  try {
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check if user has access to this record
    if (record.createdBy.toString() !== req.user._id.toString() && 
        !['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Import NemsisValidator
    const NemsisValidator = require('../services/validation/nemsisValidator');
    const validator = new NemsisValidator();

    // Validate the record
    const validationResults = await validator.validateNemsisRecord(record, {
      stateSpecific: req.body.stateSpecific || false
    });

    // Update record with validation results
    record.validationResults = validationResults;
    record.complianceStatus = validationResults.valid ? 'Compliant' : 'Non-Compliant';
    record.lastModifiedBy = req.user._id;
    await record.save();

    res.json({
      message: 'Validation completed',
      validationResults,
      complianceStatus: record.complianceStatus
    });
  } catch (error) {
    console.error('Validate NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error validating record' });
  }
});

// Get NEMSIS 3.5 compliance report
router.get('/compliance/report', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { startDate, endDate, agencyNumber } = req.query;

    const query = { nemsisVersion: '3.5' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (agencyNumber) query.agencyNumber = agencyNumber;

    const records = await NemsisRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    const complianceStats = {
      total: records.length,
      compliant: records.filter(r => r.complianceStatus === 'Compliant').length,
      nonCompliant: records.filter(r => r.complianceStatus === 'Non-Compliant').length,
      pendingReview: records.filter(r => r.complianceStatus === 'Pending Review').length,
      stateSubmitted: records.filter(r => r.stateSubmission).length,
      federalSubmitted: records.filter(r => r.federalSubmission).length
    };

    complianceStats.complianceRate = complianceStats.total > 0 
      ? (complianceStats.compliant / complianceStats.total * 100).toFixed(2)
      : 0;

    res.json({
      complianceStats,
      records: records.map(record => ({
        id: record._id,
        recordId: record.recordId,
        incidentNumber: record.incidentNumber,
        agencyNumber: record.agencyNumber,
        complianceStatus: record.complianceStatus,
        validationResults: record.validationResults,
        createdBy: record.createdBy,
        createdAt: record.createdAt,
        stateSubmission: record.stateSubmission,
        federalSubmission: record.federalSubmission
      }))
    });
  } catch (error) {
    console.error('Get NEMSIS compliance report error:', error);
    res.status(500).json({ error: 'Server error generating compliance report' });
  }
});

// Submit record to state/federal
router.post('/:id/submit', auth, requireRole(['admin', 'officer']), [
  body('submissionType').isIn(['state', 'federal', 'both']).withMessage('Submission type must be state, federal, or both')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { submissionType } = req.body;
    const record = await NemsisRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check compliance before submission
    if (record.complianceStatus !== 'Compliant') {
      return res.status(400).json({ 
        error: 'Record must be compliant before submission',
        complianceStatus: record.complianceStatus
      });
    }

    // Update submission status
    if (submissionType === 'state' || submissionType === 'both') {
      record.stateSubmission = true;
    }
    if (submissionType === 'federal' || submissionType === 'both') {
      record.federalSubmission = true;
    }
    
    record.submissionDate = new Date();
    record.lastModifiedBy = req.user._id;
    await record.save();

    res.json({ 
      message: `Record submitted to ${submissionType}`,
      record: {
        id: record._id,
        recordId: record.recordId,
        stateSubmission: record.stateSubmission,
        federalSubmission: record.federalSubmission,
        submissionDate: record.submissionDate
      }
    });
  } catch (error) {
    console.error('Submit NEMSIS record error:', error);
    res.status(500).json({ error: 'Server error submitting record' });
  }
});

// Export NEMSIS data for state/federal upload
router.get('/export/:format', auth, requireRole(['admin', 'officer']), async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, status, nemsisVersion = '3.5' } = req.query;

    const query = { nemsisVersion };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (status) query.complianceStatus = status;

    const records = await NemsisRecord.find(query)
      .populate('createdBy', 'firstName lastName badgeNumber');

    if (format === 'xml') {
      // Convert to NEMSIS 3.5 XML format
      const xml = convertToNemsisXML(records);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="nemsis-3.5-export.xml"');
      res.send(xml);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="nemsis-3.5-export.csv"');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Invalid format. Use xml or csv' });
    }
  } catch (error) {
    console.error('Export NEMSIS data error:', error);
    res.status(500).json({ error: 'Server error exporting data' });
  }
});

// Helper function to convert records to NEMSIS 3.5 XML format
function convertToNemsisXML(records) {
  // This is a simplified XML conversion for NEMSIS 3.5
  // In a real implementation, you would use a proper XML library
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<NEMSISDataSet version="3.5">\n';
  
  records.forEach(record => {
    xml += '  <EMSDataSet>\n';
    xml += '    <Response>\n';
    xml += `      <eResponse.01>${record.agencyNumber || ''}</eResponse.01>\n`;
    xml += `      <eResponse.02>${record.incidentNumber || ''}</eResponse.02>\n`;
    xml += `      <eResponse.03>${record.response?.responseDate || ''}</eResponse.03>\n`;
    xml += `      <eResponse.04>${record.response?.incidentType || ''}</eResponse.04>\n`;
    xml += `      <eResponse.05>${record.response?.responseMode || ''}</eResponse.05>\n`;
    xml += `      <eResponse.06>${record.response?.city || ''}</eResponse.06>\n`;
    xml += `      <eResponse.07>${record.response?.state || 'VA'}</eResponse.07>\n`;
    xml += `      <eResponse.08>${record.response?.zipCode || ''}</eResponse.08>\n`;
    xml += `      <eResponse.09>${record.response?.county || ''}</eResponse.09>\n`;
    xml += `      <eResponse.10>${record.response?.responseLevel || ''}</eResponse.10>\n`;
    xml += '    </Response>\n';
    
    xml += '    <Times>\n';
    xml += `      <eTimes.01>${record.times?.dispatchTime || ''}</eTimes.01>\n`;
    xml += `      <eTimes.02>${record.times?.enRouteTime || ''}</eTimes.02>\n`;
    xml += `      <eTimes.03>${record.times?.arrivalTime || ''}</eTimes.03>\n`;
    xml += `      <eTimes.04>${record.times?.clearTime || ''}</eTimes.04>\n`;
    xml += `      <eTimes.05>${record.times?.transportTime || ''}</eTimes.05>\n`;
    xml += '    </Times>\n';
    
    xml += '    <Patient>\n';
    xml += `      <ePatient.01>${record.patient?.age || ''}</ePatient.01>\n`;
    xml += `      <ePatient.02>${record.patient?.gender || ''}</ePatient.02>\n`;
    xml += `      <ePatient.03>${record.patient?.race || ''}</ePatient.03>\n`;
    xml += `      <ePatient.04>${record.patient?.ethnicity || ''}</ePatient.04>\n`;
    xml += `      <ePatient.05>${record.patient?.weight || ''}</ePatient.05>\n`;
    xml += `      <ePatient.06>${record.patient?.height || ''}</ePatient.06>\n`;
    xml += `      <ePatient.07>${record.patient?.dateOfBirth || ''}</ePatient.07>\n`;
    xml += `      <ePatient.08>${record.patient?.name || ''}</ePatient.08>\n`;
    xml += `      <ePatient.09>${record.patient?.address || ''}</ePatient.09>\n`;
    xml += `      <ePatient.10>${record.patient?.phone || ''}</ePatient.10>\n`;
    xml += '    </Patient>\n';
    
    xml += '    <Clinical>\n';
    xml += `      <eClinical.01>${record.clinical?.chiefComplaint || ''}</eClinical.01>\n`;
    xml += `      <eClinical.02>${record.clinical?.primaryImpression || ''}</eClinical.02>\n`;
    xml += `      <eClinical.03>${record.clinical?.secondaryImpression || ''}</eClinical.03>\n`;
    xml += `      <eClinical.04>${record.clinical?.clinicalAssessment || ''}</eClinical.04>\n`;
    xml += `      <eClinical.05>${record.clinical?.treatmentPlan || ''}</eClinical.05>\n`;
    xml += '    </Clinical>\n';
    
    xml += '    <Disposition>\n';
    xml += `      <eDisposition.01>${record.disposition?.patientDisposition || ''}</eDisposition.01>\n`;
    xml += `      <eDisposition.02>${record.disposition?.transportMode || ''}</eDisposition.02>\n`;
    xml += `      <eDisposition.03>${record.disposition?.destination || ''}</eDisposition.03>\n`;
    xml += `      <eDisposition.27>${record.disposition?.unitDisposition || ''}</eDisposition.27>\n`;
    xml += `      <eDisposition.28>${record.disposition?.patientEvaluation || ''}</eDisposition.28>\n`;
    xml += `      <eDisposition.29>${record.disposition?.crewDisposition || ''}</eDisposition.29>\n`;
    xml += `      <eDisposition.30>${record.disposition?.transportDisposition || ''}</eDisposition.30>\n`;
    xml += '    </Disposition>\n';
    
    xml += '    <Transport>\n';
    xml += `      <eTransport.01>${record.transport?.transportMode || ''}</eTransport.01>\n`;
    xml += `      <eTransport.02>${record.transport?.transportPriority || ''}</eTransport.02>\n`;
    xml += `      <eTransport.03>${record.transport?.transportReason || ''}</eTransport.03>\n`;
    xml += '    </Transport>\n';
    
    xml += '    <Crew>\n';
    xml += `      <eCrew.01>${record.crew?.name || ''}</eCrew.01>\n`;
    xml += `      <eCrew.02>${record.crew?.role || ''}</eCrew.02>\n`;
    xml += `      <eCrew.03>${record.crew?.certification || ''}</eCrew.03>\n`;
    xml += '    </Crew>\n';
    
    xml += '    <Vehicle>\n';
    xml += `      <eVehicle.01>${record.vehicle?.unitId || ''}</eVehicle.01>\n`;
    xml += `      <eVehicle.02>${record.vehicle?.type || ''}</eVehicle.02>\n`;
    xml += `      <eVehicle.03>${record.vehicle?.level || ''}</eVehicle.03>\n`;
    xml += '    </Vehicle>\n';
    
    xml += '    <VitalSigns>\n';
    xml += `      <eVital.01>${record.vitalSigns?.systolic || ''}</eVital.01>\n`;
    xml += `      <eVital.02>${record.vitalSigns?.diastolic || ''}</eVital.02>\n`;
    xml += `      <eVital.03>${record.vitalSigns?.heartRate || ''}</eVital.03>\n`;
    xml += `      <eVital.04>${record.vitalSigns?.respiratoryRate || ''}</eVital.04>\n`;
    xml += `      <eVital.05>${record.vitalSigns?.temperature || ''}</eVital.05>\n`;
    xml += `      <eVital.06>${record.vitalSigns?.oxygenSaturation || ''}</eVital.06>\n`;
    xml += '    </VitalSigns>\n';
    
    xml += '    <Medication>\n';
    xml += `      <eMedication.01>${record.medication?.name || ''}</eMedication.01>\n`;
    xml += `      <eMedication.02>${record.medication?.dose || ''}</eMedication.02>\n`;
    xml += `      <eMedication.03>${record.medication?.route || ''}</eMedication.03>\n`;
    xml += '    </Medication>\n';
    
    xml += '    <Procedure>\n';
    xml += `      <eProcedure.01>${record.procedure?.name || ''}</eProcedure.01>\n`;
    xml += `      <eProcedure.02>${record.procedure?.time || ''}</eProcedure.02>\n`;
    xml += `      <eProcedure.03>${record.procedure?.success || ''}</eProcedure.03>\n`;
    xml += '    </Procedure>\n';
    
    xml += '    <Injury>\n';
    xml += `      <eInjury.01>${record.injury?.type || ''}</eInjury.01>\n`;
    xml += `      <eInjury.02>${record.injury?.mechanism || ''}</eInjury.02>\n`;
    xml += `      <eInjury.03>${record.injury?.location || ''}</eInjury.03>\n`;
    xml += '    </Injury>\n';
    
    xml += '    <Outcome>\n';
    xml += `      <eOutcome.01>${record.outcome?.patientOutcome || ''}</eOutcome.01>\n`;
    xml += `      <eOutcome.02>${record.outcome?.treatmentOutcome || ''}</eOutcome.02>\n`;
    xml += `      <eOutcome.03>${record.outcome?.dischargeStatus || ''}</eOutcome.03>\n`;
    xml += '    </Outcome>\n';
    
    xml += '  </EMSDataSet>\n';
  });
  
  xml += '</NEMSISDataSet>';
  return xml;
}

// Helper function to convert records to CSV format
function convertToCSV(records) {
  const headers = [
    'RecordID', 'AgencyNumber', 'IncidentNumber', 'ResponseDate', 'IncidentType',
    'PatientAge', 'PatientGender', 'ChiefComplaint', 'PrimaryImpression',
    'UnitDisposition', 'PatientEvaluation', 'CrewDisposition', 'TransportDisposition',
    'ComplianceStatus', 'NEMSISVersion', 'StateSubmission', 'FederalSubmission'
  ];
  
  let csv = headers.join(',') + '\n';
  
  records.forEach(record => {
    const row = [
      record.recordId,
      record.agencyNumber,
      record.incidentNumber,
      record.response?.responseDate || '',
      record.response?.incidentType || '',
      record.patient?.age || '',
      record.patient?.gender || '',
      record.clinical?.chiefComplaint || '',
      record.clinical?.primaryImpression || '',
      record.disposition?.unitDisposition || '',
      record.disposition?.patientEvaluation || '',
      record.disposition?.crewDisposition || '',
      record.disposition?.transportDisposition || '',
      record.complianceStatus || '',
      record.nemsisVersion || '',
      record.stateSubmission || false,
      record.federalSubmission || false
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

module.exports = router;