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
    // This is a simplified conversion
    // In a real implementation, this would be much more comprehensive
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<EMSDataSet>
  <Response>
    <eResponse.01>${recordData.agencyId || 'MANGOHICK-VFD-001'}</eResponse.01>
    <eResponse.02>${recordData.incident?.incidentNumber || ''}</eResponse.02>
    <eTimes.03>${recordData.incident?.dispatchTime || ''}</eTimes.03>
    <eTimes.05>${recordData.incident?.arrivalTime || ''}</eTimes.05>
  </Response>
  <Patient>
    <ePatient.01>${recordData.patient?.demographics?.age || ''}</ePatient.01>
    <ePatient.02>${recordData.patient?.demographics?.gender || ''}</ePatient.02>
  </Patient>
  <Clinical>
    <eDisposition.27>${recordData.clinical?.disposition?.unitDisposition || ''}</eDisposition.27>
    <eDisposition.28>${recordData.clinical?.disposition?.patientEvaluation || ''}</eDisposition.28>
    <eDisposition.29>${recordData.clinical?.disposition?.crewDisposition || ''}</eDisposition.29>
    <eDisposition.30>${recordData.clinical?.disposition?.transportDisposition || ''}</eDisposition.30>
  </Clinical>
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