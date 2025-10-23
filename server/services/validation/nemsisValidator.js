const { DOMParser } = require('xmldom');
const xpath = require('xpath');
const fs = require('fs');
const path = require('path');

class NemsisValidator {
  constructor() {
    this.xsdCache = new Map();
    this.schematronCache = new Map();
    this.validationRules = new Map();
    this.loadValidationRules();
  }

  // Load validation rules from files
  loadValidationRules() {
    try {
      // Load NEMSIS v3.5 XSD schemas
      this.loadXSD('nemsis-v3.5.0.xsd');
      
      // Load Virginia state-specific Schematron rules
      this.loadSchematron('virginia-nemsis-v3.5.sch');
      
      // Load national Schematron rules
      this.loadSchematron('nemsis-v3.5-national.sch');
    } catch (error) {
      console.error('Error loading validation rules:', error);
    }
  }

  // Load XSD schema
  loadXSD(filename) {
    try {
      const xsdPath = path.join(__dirname, 'schemas', filename);
      const xsdContent = fs.readFileSync(xsdPath, 'utf8');
      this.xsdCache.set(filename, xsdContent);
    } catch (error) {
      console.error(`Error loading XSD ${filename}:`, error);
    }
  }

  // Load Schematron rules
  loadSchematron(filename) {
    try {
      const schPath = path.join(__dirname, 'schemas', filename);
      const schContent = fs.readFileSync(schPath, 'utf8');
      this.schematronCache.set(filename, schContent);
    } catch (error) {
      console.error(`Error loading Schematron ${filename}:`, error);
    }
  }

  // Validate NEMSIS record
  async validateNemsisRecord(recordData, options = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      dataQualityScore: 100,
      validationTime: Date.now()
    };

    try {
      // Convert record to NEMSIS XML
      const xmlString = this.convertToNemsisXML(recordData);
      
      // XSD Validation
      const xsdResults = await this.validateXSD(xmlString);
      results.errors.push(...xsdResults.errors);
      results.warnings.push(...xsdResults.warnings);

      // Schematron Validation
      const schematronResults = await this.validateSchematron(xmlString, options.stateSpecific);
      results.errors.push(...schematronResults.errors);
      results.warnings.push(...schematronResults.warnings);
      results.dataQualityScore = schematronResults.dataQualityScore;

      // Business Rule Validation
      const businessResults = this.validateBusinessRules(recordData);
      results.errors.push(...businessResults.errors);
      results.warnings.push(...businessResults.warnings);

      // Calculate final validation status
      results.valid = results.errors.length === 0;
      results.dataQualityScore = Math.max(0, results.dataQualityScore - (results.warnings.length * 2));

    } catch (error) {
      results.valid = false;
      results.errors.push({
        code: 'VALIDATION_ERROR',
        message: 'Validation process failed',
        details: error.message,
        severity: 'ERROR'
      });
    }

    return results;
  }

  // XSD Validation
  async validateXSD(xmlString) {
    const results = { errors: [], warnings: [] };
    
    try {
      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for parsing errors
      const parseErrors = xmlDoc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        results.errors.push({
          code: 'XML_PARSE_ERROR',
          message: 'Invalid XML format',
          details: parseErrors[0].textContent,
          severity: 'ERROR'
        });
        return results;
      }

      // Basic XSD validation (simplified for this example)
      // In a real implementation, you would use a proper XSD validator
      const requiredElements = [
        'eResponse.01', // Agency Number
        'eResponse.02', // Incident Number
        'eTimes.03',    // Dispatch Date/Time
        'ePatient.01',  // Patient Age
        'ePatient.02'   // Patient Gender
      ];

      for (const element of requiredElements) {
        if (!this.elementExists(xmlDoc, element)) {
          results.errors.push({
            code: 'MISSING_REQUIRED_ELEMENT',
            message: `Required element ${element} is missing`,
            element: element,
            severity: 'ERROR'
          });
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'XSD_VALIDATION_ERROR',
        message: 'XSD validation failed',
        details: error.message,
        severity: 'ERROR'
      });
    }

    return results;
  }

  // Schematron Validation
  async validateSchematron(xmlString, stateSpecific = false) {
    const results = { errors: [], warnings: [], dataQualityScore: 100 };
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Load Schematron rules
      const schematronFiles = ['nemsis-v3.5-national.sch'];
      if (stateSpecific) {
        schematronFiles.push('virginia-nemsis-v3.5.sch');
      }

      for (const filename of schematronFiles) {
        const schematronContent = this.schematronCache.get(filename);
        if (schematronContent) {
          const schResults = this.executeSchematronRules(xmlDoc, schematronContent);
          results.errors.push(...schResults.errors);
          results.warnings.push(...schResults.warnings);
          results.dataQualityScore = Math.min(results.dataQualityScore, schResults.dataQualityScore);
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'SCHEMATRON_VALIDATION_ERROR',
        message: 'Schematron validation failed',
        details: error.message,
        severity: 'ERROR'
      });
    }

    return results;
  }

  // Execute Schematron rules
  executeSchematronRules(xmlDoc, schematronContent) {
    const results = { errors: [], warnings: [], dataQualityScore: 100 };
    
    try {
      // Parse Schematron
      const parser = new DOMParser();
      const schDoc = parser.parseFromString(schematronContent, 'text/xml');
      
      // Get all rules
      const rules = xpath.select('//sch:rule', schDoc);
      
      for (const rule of rules) {
        const context = rule.getAttribute('context');
        const assertions = xpath.select('.//sch:assert', rule);
        
        for (const assertion of assertions) {
          const test = assertion.getAttribute('test');
          const message = assertion.textContent;
          const severity = assertion.getAttribute('severity') || 'error';
          
          // Evaluate XPath expression
          const nodes = xpath.select(context, xmlDoc);
          
          for (const node of nodes) {
            const isValid = this.evaluateXPathTest(node, test, xmlDoc);
            
            if (!isValid) {
              const error = {
                code: 'SCHEMATRON_RULE_VIOLATION',
                message: message,
                context: context,
                test: test,
                severity: severity.toUpperCase(),
                element: this.getElementPath(node)
              };
              
              if (severity === 'warning') {
                results.warnings.push(error);
                results.dataQualityScore -= 1;
              } else {
                results.errors.push(error);
                results.dataQualityScore -= 5;
              }
            }
          }
        }
      }

    } catch (error) {
      results.errors.push({
        code: 'SCHEMATRON_EXECUTION_ERROR',
        message: 'Error executing Schematron rules',
        details: error.message,
        severity: 'ERROR'
      });
    }

    return results;
  }

  // Business Rule Validation
  validateBusinessRules(recordData) {
    const results = { errors: [], warnings: [] };
    
    // NEMSIS v3.5 specific business rules
    const rules = [
      {
        name: 'Patient Age Validation',
        test: (data) => {
          const age = data.patient?.demographics?.age;
          const ageUnits = data.patient?.demographics?.ageUnits;
          
          if (age && ageUnits === 'Years' && (age < 0 || age > 120)) {
            return false;
          }
          return true;
        },
        message: 'Patient age must be between 0 and 120 years',
        severity: 'ERROR'
      },
      {
        name: 'Required Disposition Elements',
        test: (data) => {
          // Check for new v3.5 disposition elements
          const hasDisposition = data.clinical?.disposition;
          if (hasDisposition) {
            const requiredElements = [
              'unitDisposition',
              'patientEvaluation',
              'crewDisposition',
              'transportDisposition'
            ];
            
            return requiredElements.every(element => 
              data.clinical.disposition[element] !== undefined
            );
          }
          return true;
        },
        message: 'All four disposition elements are required in NEMSIS v3.5',
        severity: 'ERROR'
      },
      {
        name: 'Vital Signs Validation',
        test: (data) => {
          const vitalSigns = data.clinical?.vitalSigns;
          if (vitalSigns && Array.isArray(vitalSigns)) {
            for (const vital of vitalSigns) {
              if (vital.bloodPressure) {
                const { systolic, diastolic } = vital.bloodPressure;
                if (systolic && diastolic && systolic <= diastolic) {
                  return false;
                }
              }
            }
          }
          return true;
        },
        message: 'Systolic blood pressure must be greater than diastolic',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Vital Signs Range Validation',
        test: (data) => {
          const vitalSigns = data.clinical?.vitalSigns;
          if (vitalSigns) {
            const { systolic, diastolic, heartRate, respiratoryRate, temperature, oxygenSaturation, glasgowComaScale, painScale } = vitalSigns;
            
            if (systolic && (systolic < 0 || systolic > 300)) return false;
            if (diastolic && (diastolic < 0 || diastolic > 200)) return false;
            if (heartRate && (heartRate < 0 || heartRate > 300)) return false;
            if (respiratoryRate && (respiratoryRate < 0 || respiratoryRate > 100)) return false;
            if (temperature && (temperature < 80 || temperature > 120)) return false;
            if (oxygenSaturation && (oxygenSaturation < 0 || oxygenSaturation > 100)) return false;
            if (glasgowComaScale && (glasgowComaScale < 3 || glasgowComaScale > 15)) return false;
            if (painScale && (painScale < 0 || painScale > 10)) return false;
          }
          return true;
        },
        message: 'Vital signs must be within acceptable ranges for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Crew Validation',
        test: (data) => {
          const crew = data.crew;
          if (crew && Array.isArray(crew)) {
            for (const member of crew) {
              if (!member.name || !member.role) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Crew members must have name and role for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Vehicle Validation',
        test: (data) => {
          const vehicle = data.vehicle;
          if (vehicle && (!vehicle.unitId || !vehicle.type)) {
            return false;
          }
          return true;
        },
        message: 'Vehicle must have unit ID and type for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Medication Validation',
        test: (data) => {
          const medications = data.medications;
          if (medications && Array.isArray(medications)) {
            for (const med of medications) {
              if (!med.name || !med.dose || !med.route) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Medications must have name, dose, and route for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Procedure Validation',
        test: (data) => {
          const procedures = data.procedures;
          if (procedures && Array.isArray(procedures)) {
            for (const proc of procedures) {
              if (!proc.name || !proc.time) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Procedures must have name and time for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Injury Validation',
        test: (data) => {
          const injuries = data.injuries;
          if (injuries && Array.isArray(injuries)) {
            for (const injury of injuries) {
              if (!injury.type || !injury.mechanism) {
                return false;
              }
            }
          }
          return true;
        },
        message: 'Injuries must have type and mechanism for NEMSIS 3.5',
        severity: 'WARNING'
      },
      {
        name: 'NEMSIS 3.5 Outcome Validation',
        test: (data) => {
          const outcome = data.outcome;
          if (outcome && !outcome.patientOutcome) {
            return false;
          }
          return true;
        },
        message: 'Outcome must have patient outcome for NEMSIS 3.5',
        severity: 'WARNING'
      }
    ];

    // Execute business rules
    for (const rule of rules) {
      try {
        if (!rule.test(recordData)) {
          const error = {
            code: 'BUSINESS_RULE_VIOLATION',
            message: rule.message,
            rule: rule.name,
            severity: rule.severity
          };
          
          if (rule.severity === 'WARNING') {
            results.warnings.push(error);
          } else {
            results.errors.push(error);
          }
        }
      } catch (error) {
        results.errors.push({
          code: 'BUSINESS_RULE_ERROR',
          message: `Error executing rule: ${rule.name}`,
          details: error.message,
          severity: 'ERROR'
        });
      }
    }

    return results;
  }

  // Convert record to NEMSIS XML
  convertToNemsisXML(recordData) {
    // This is a simplified conversion for NEMSIS 3.5
    // In a real implementation, this would be much more comprehensive
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EMSDataSet>
  <Response>
    <eResponse.01>${recordData.agencyId || 'MANGOHICK-VFD-001'}</eResponse.01>
    <eResponse.02>${recordData.incident?.incidentNumber || ''}</eResponse.02>
    <eResponse.03>${recordData.incident?.responseTime || ''}</eResponse.03>
    <eResponse.04>${recordData.incident?.incidentType || ''}</eResponse.04>
    <eResponse.05>${recordData.incident?.responseMode || ''}</eResponse.05>
    <eResponse.06>${recordData.incident?.city || ''}</eResponse.06>
    <eResponse.07>${recordData.incident?.state || 'VA'}</eResponse.07>
    <eResponse.08>${recordData.incident?.zipCode || ''}</eResponse.08>
    <eResponse.09>${recordData.incident?.county || ''}</eResponse.09>
    <eResponse.10>${recordData.incident?.responseLevel || ''}</eResponse.10>
  </Response>
  <Times>
    <eTimes.01>${recordData.incident?.dispatchTime || ''}</eTimes.01>
    <eTimes.02>${recordData.incident?.enRouteTime || ''}</eTimes.02>
    <eTimes.03>${recordData.incident?.arrivalTime || ''}</eTimes.03>
    <eTimes.04>${recordData.incident?.clearTime || ''}</eTimes.04>
    <eTimes.05>${recordData.incident?.transportTime || ''}</eTimes.05>
    <eTimes.06>${recordData.incident?.hospitalArrivalTime || ''}</eTimes.06>
    <eTimes.07>${recordData.incident?.hospitalDepartureTime || ''}</eTimes.07>
    <eTimes.08>${recordData.incident?.backInServiceTime || ''}</eTimes.08>
    <eTimes.09>${recordData.incident?.patientContactTime || ''}</eTimes.09>
    <eTimes.10>${recordData.incident?.patientCareTime || ''}</eTimes.10>
  </Times>
  <Patient>
    <ePatient.01>${recordData.patient?.demographics?.age || ''}</ePatient.01>
    <ePatient.02>${recordData.patient?.demographics?.gender || ''}</ePatient.02>
    <ePatient.03>${recordData.patient?.demographics?.race || ''}</ePatient.03>
    <ePatient.04>${recordData.patient?.demographics?.ethnicity || ''}</ePatient.04>
    <ePatient.05>${recordData.patient?.demographics?.weight || ''}</ePatient.05>
    <ePatient.06>${recordData.patient?.demographics?.height || ''}</ePatient.06>
    <ePatient.07>${recordData.patient?.demographics?.dateOfBirth || ''}</ePatient.07>
    <ePatient.08>${recordData.patient?.demographics?.name || ''}</ePatient.08>
    <ePatient.09>${recordData.patient?.demographics?.address || ''}</ePatient.09>
    <ePatient.10>${recordData.patient?.demographics?.phone || ''}</ePatient.10>
    <ePatient.11>${recordData.patient?.demographics?.insurance || ''}</ePatient.11>
    <ePatient.12>${recordData.patient?.demographics?.medicalHistory || ''}</ePatient.12>
    <ePatient.13>${recordData.patient?.demographics?.medications || ''}</ePatient.13>
    <ePatient.14>${recordData.patient?.demographics?.allergies || ''}</ePatient.14>
    <ePatient.15>${recordData.patient?.demographics?.chiefComplaint || ''}</ePatient.15>
  </Patient>
  <Clinical>
    <eClinical.01>${recordData.clinical?.chiefComplaint || ''}</eClinical.01>
    <eClinical.02>${recordData.clinical?.primaryImpression || ''}</eClinical.02>
    <eClinical.03>${recordData.clinical?.secondaryImpression || ''}</eClinical.03>
    <eClinical.04>${recordData.clinical?.clinicalAssessment || ''}</eClinical.04>
    <eClinical.05>${recordData.clinical?.treatmentPlan || ''}</eClinical.05>
    <eClinical.06>${recordData.clinical?.clinicalNotes || ''}</eClinical.06>
    <eClinical.07>${recordData.clinical?.painScale || ''}</eClinical.07>
    <eClinical.08>${recordData.clinical?.glasgowComaScale || ''}</eClinical.08>
    <eClinical.09>${recordData.clinical?.mentalStatus || ''}</eClinical.09>
    <eClinical.10>${recordData.clinical?.neurologicalAssessment || ''}</eClinical.10>
  </Clinical>
  <Disposition>
    <eDisposition.01>${recordData.disposition?.patientDisposition || ''}</eDisposition.01>
    <eDisposition.02>${recordData.disposition?.transportMode || ''}</eDisposition.02>
    <eDisposition.03>${recordData.disposition?.destination || ''}</eDisposition.03>
    <eDisposition.04>${recordData.disposition?.destinationType || ''}</eDisposition.04>
    <eDisposition.05>${recordData.disposition?.destinationName || ''}</eDisposition.05>
    <eDisposition.06>${recordData.disposition?.destinationAddress || ''}</eDisposition.06>
    <eDisposition.07>${recordData.disposition?.destinationCity || ''}</eDisposition.07>
    <eDisposition.08>${recordData.disposition?.destinationState || ''}</eDisposition.08>
    <eDisposition.09>${recordData.disposition?.destinationZip || ''}</eDisposition.09>
    <eDisposition.10>${recordData.disposition?.destinationCounty || ''}</eDisposition.10>
    <eDisposition.27>${recordData.disposition?.unitDisposition || ''}</eDisposition.27>
    <eDisposition.28>${recordData.disposition?.patientEvaluation || ''}</eDisposition.28>
    <eDisposition.29>${recordData.disposition?.crewDisposition || ''}</eDisposition.29>
    <eDisposition.30>${recordData.disposition?.transportDisposition || ''}</eDisposition.30>
  </Disposition>
  <Transport>
    <eTransport.01>${recordData.transport?.transportMode || ''}</eTransport.01>
    <eTransport.02>${recordData.transport?.transportPriority || ''}</eTransport.02>
    <eTransport.03>${recordData.transport?.transportReason || ''}</eTransport.03>
    <eTransport.04>${recordData.transport?.transportDistance || ''}</eTransport.04>
    <eTransport.05>${recordData.transport?.transportStartTime || ''}</eTransport.05>
    <eTransport.06>${recordData.transport?.transportEndTime || ''}</eTransport.06>
    <eTransport.07>${recordData.transport?.transportNotes || ''}</eTransport.07>
  </Transport>
  <Crew>
    <eCrew.01>${recordData.crew?.name || ''}</eCrew.01>
    <eCrew.02>${recordData.crew?.role || ''}</eCrew.02>
    <eCrew.03>${recordData.crew?.certification || ''}</eCrew.03>
    <eCrew.04>${recordData.crew?.license || ''}</eCrew.04>
    <eCrew.05>${recordData.crew?.badge || ''}</eCrew.05>
  </Crew>
  <Vehicle>
    <eVehicle.01>${recordData.vehicle?.unitId || ''}</eVehicle.01>
    <eVehicle.02>${recordData.vehicle?.type || ''}</eVehicle.02>
    <eVehicle.03>${recordData.vehicle?.level || ''}</eVehicle.03>
    <eVehicle.04>${recordData.vehicle?.equipment || ''}</eVehicle.04>
    <eVehicle.05>${recordData.vehicle?.status || ''}</eVehicle.05>
  </Vehicle>
  <VitalSigns>
    <eVital.01>${recordData.vitalSigns?.systolic || ''}</eVital.01>
    <eVital.02>${recordData.vitalSigns?.diastolic || ''}</eVital.02>
    <eVital.03>${recordData.vitalSigns?.heartRate || ''}</eVital.03>
    <eVital.04>${recordData.vitalSigns?.respiratoryRate || ''}</eVital.04>
    <eVital.05>${recordData.vitalSigns?.temperature || ''}</eVital.05>
    <eVital.06>${recordData.vitalSigns?.oxygenSaturation || ''}</eVital.06>
    <eVital.07>${recordData.vitalSigns?.glasgowComaScale || ''}</eVital.07>
    <eVital.08>${recordData.vitalSigns?.painScale || ''}</eVital.08>
  </VitalSigns>
  <Medication>
    <eMedication.01>${recordData.medication?.name || ''}</eMedication.01>
    <eMedication.02>${recordData.medication?.dose || ''}</eMedication.02>
    <eMedication.03>${recordData.medication?.route || ''}</eMedication.03>
    <eMedication.04>${recordData.medication?.time || ''}</eMedication.04>
    <eMedication.05>${recordData.medication?.response || ''}</eMedication.05>
  </Medication>
  <Procedure>
    <eProcedure.01>${recordData.procedure?.name || ''}</eProcedure.01>
    <eProcedure.02>${recordData.procedure?.time || ''}</eProcedure.02>
    <eProcedure.03>${recordData.procedure?.success || ''}</eProcedure.03>
    <eProcedure.04>${recordData.procedure?.complications || ''}</eProcedure.04>
    <eProcedure.05>${recordData.procedure?.notes || ''}</eProcedure.05>
  </Procedure>
  <Injury>
    <eInjury.01>${recordData.injury?.type || ''}</eInjury.01>
    <eInjury.02>${recordData.injury?.mechanism || ''}</eInjury.02>
    <eInjury.03>${recordData.injury?.location || ''}</eInjury.03>
    <eInjury.04>${recordData.injury?.severity || ''}</eInjury.04>
    <eInjury.05>${recordData.injury?.description || ''}</eInjury.05>
  </Injury>
  <Outcome>
    <eOutcome.01>${recordData.outcome?.patientOutcome || ''}</eOutcome.01>
    <eOutcome.02>${recordData.outcome?.treatmentOutcome || ''}</eOutcome.02>
    <eOutcome.03>${recordData.outcome?.dischargeStatus || ''}</eOutcome.03>
    <eOutcome.04>${recordData.outcome?.followUpRequired || ''}</eOutcome.04>
    <eOutcome.05>${recordData.outcome?.outcomeNotes || ''}</eOutcome.05>
  </Outcome>
</EMSDataSet>`;
    
    return xml;
  }

  // Helper methods
  elementExists(xmlDoc, elementName) {
    const elements = xpath.select(`//${elementName}`, xmlDoc);
    return elements.length > 0;
  }

  evaluateXPathTest(node, test, xmlDoc) {
    try {
      // Simplified XPath evaluation
      // In a real implementation, you would use a proper XPath evaluator
      return true; // Placeholder
    } catch (error) {
      return false;
    }
  }

  getElementPath(node) {
    const path = [];
    let current = node;
    
    while (current && current.nodeType === 1) {
      path.unshift(current.nodeName);
      current = current.parentNode;
    }
    
    return path.join('/');
  }
}

module.exports = NemsisValidator;