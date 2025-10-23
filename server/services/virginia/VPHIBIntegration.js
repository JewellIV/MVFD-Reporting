const axios = require('axios');
const xml2js = require('xml2js');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

class VPHIBIntegration {
  constructor() {
    this.apiEndpoint = process.env.VPHIB_API_URL || 'https://vphib.vdh.virginia.gov/api';
    this.apiKey = process.env.VPHIB_API_KEY;
    this.timeout = 30000; // 30 seconds
  }

  // Submit NEMSIS record to VPHIB
  async submitNemsisRecord(nemsisData, options = {}) {
    try {
      // Convert to NEMSIS v3.5 XML format
      const xmlData = await this.convertToNemsisXML(nemsisData);
      
      // Validate XML before submission
      const validationResult = await this.validateNemsisXML(xmlData);
      if (!validationResult.valid) {
        throw new Error(`NEMSIS validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Submit to VPHIB
      const response = await axios.post(`${this.apiEndpoint}/submit`, {
        xmlData: xmlData,
        agencyId: nemsisData.agencyId,
        submissionType: 'NEMSIS',
        version: '3.5'
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      // Process response
      const result = {
        success: response.data.success,
        submissionId: response.data.submissionId,
        timestamp: new Date().toISOString(),
        validationResults: response.data.validationResults,
        errors: response.data.errors || [],
        warnings: response.data.warnings || []
      };

      return result;

    } catch (error) {
      console.error('VPHIB submission error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Convert NEMSIS data to XML format
  async convertToNemsisXML(nemsisData) {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      rootName: 'EMSDataSet',
      headless: false
    });

    const xmlObject = {
      $: {
        'xmlns': 'http://www.nemsis.org',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.nemsis.org http://www.nemsis.org/media/nemsis_v3/3.5.0/EMSDataSet.xsd'
      },
      Response: [{
        'eResponse.01': [nemsisData.agencyId || 'MANGOHICK-VFD-001'],
        'eResponse.02': [nemsisData.incident?.incidentNumber || ''],
        'eResponse.03': [nemsisData.incident?.incidentDate || ''],
        'eResponse.04': [nemsisData.incident?.incidentType || ''],
        'eResponse.05': [nemsisData.incident?.responseMode || ''],
        'eResponse.06': [nemsisData.incident?.location?.address || ''],
        'eResponse.07': [nemsisData.incident?.location?.city || ''],
        'eResponse.08': [nemsisData.incident?.location?.state || 'VA'],
        'eResponse.09': [nemsisData.incident?.location?.zipCode || ''],
        'eResponse.10': [nemsisData.incident?.location?.county || '']
      }],
      Times: [{
        'eTimes.01': [nemsisData.incident?.dispatchTime || ''],
        'eTimes.02': [nemsisData.incident?.enRouteTime || ''],
        'eTimes.03': [nemsisData.incident?.arrivalTime || ''],
        'eTimes.04': [nemsisData.incident?.clearTime || ''],
        'eTimes.05': [nemsisData.incident?.transportTime || '']
      }],
      Patient: [{
        'ePatient.01': [nemsisData.patient?.demographics?.age || ''],
        'ePatient.02': [nemsisData.patient?.demographics?.gender || ''],
        'ePatient.03': [nemsisData.patient?.demographics?.race || ''],
        'ePatient.04': [nemsisData.patient?.demographics?.ethnicity || ''],
        'ePatient.05': [nemsisData.patient?.demographics?.weight || ''],
        'ePatient.06': [nemsisData.patient?.demographics?.height || ''],
        'ePatient.07': [nemsisData.patient?.demographics?.dateOfBirth || ''],
        'ePatient.08': [nemsisData.patient?.demographics?.socialSecurityNumber || ''],
        'ePatient.09': [nemsisData.patient?.demographics?.driversLicenseNumber || ''],
        'ePatient.10': [nemsisData.patient?.demographics?.medicalRecordNumber || '']
      }],
      Clinical: [{
        'eClinical.01': [nemsisData.clinical?.chiefComplaint || ''],
        'eClinical.02': [nemsisData.clinical?.primaryImpression || ''],
        'eClinical.03': [nemsisData.clinical?.secondaryImpression || ''],
        'eClinical.04': [nemsisData.clinical?.assessment?.primaryAssessment || ''],
        'eClinical.05': [nemsisData.clinical?.assessment?.secondaryAssessment || ''],
        'eClinical.06': [nemsisData.clinical?.assessment?.differentialDiagnosis || '']
      }],
      Disposition: [{
        'eDisposition.27': [nemsisData.clinical?.disposition?.unitDisposition || ''],
        'eDisposition.28': [nemsisData.clinical?.disposition?.patientEvaluation || ''],
        'eDisposition.29': [nemsisData.clinical?.disposition?.crewDisposition || ''],
        'eDisposition.30': [nemsisData.clinical?.disposition?.transportDisposition || '']
      }],
      Transport: [{
        'eTransport.01': [nemsisData.transport?.transportMode || ''],
        'eTransport.02': [nemsisData.transport?.destination?.name || ''],
        'eTransport.03': [nemsisData.transport?.destination?.type || ''],
        'eTransport.04': [nemsisData.transport?.destination?.address || ''],
        'eTransport.05': [nemsisData.transport?.transportTime || ''],
        'eTransport.06': [nemsisData.transport?.arrivalTime || ''],
        'eTransport.07': [nemsisData.transport?.patientDisposition || '']
      }]
    };

    return builder.buildObject(xmlObject);
  }

  // Validate NEMSIS XML
  async validateNemsisXML(xmlData) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      // Check for parsing errors
      const parseErrors = xmlDoc.getElementsByTagName('parsererror');
      if (parseErrors.length > 0) {
        return {
          valid: false,
          errors: ['Invalid XML format: ' + parseErrors[0].textContent]
        };
      }

      // Basic validation rules
      const errors = [];
      const warnings = [];

      // Required elements validation
      const requiredElements = [
        'eResponse.01', // Agency Number
        'eResponse.02', // Incident Number
        'eTimes.01',    // Dispatch Date/Time
        'ePatient.01',  // Patient Age
        'ePatient.02'   // Patient Gender
      ];

      for (const element of requiredElements) {
        const nodes = xpath.select(`//${element}`, xmlDoc);
        if (nodes.length === 0 || !nodes[0].textContent.trim()) {
          errors.push(`Required element ${element} is missing or empty`);
        }
      }

      // Virginia-specific validation
      const vaSpecificElements = [
        'eResponse.08', // State (must be VA)
        'eResponse.09'  // Zip Code
      ];

      for (const element of vaSpecificElements) {
        const nodes = xpath.select(`//${element}`, xmlDoc);
        if (nodes.length === 0 || !nodes[0].textContent.trim()) {
          warnings.push(`Virginia-specific element ${element} is missing`);
        }
      }

      // Data quality checks
      const ageNodes = xpath.select('//ePatient.01', xmlDoc);
      if (ageNodes.length > 0) {
        const age = parseInt(ageNodes[0].textContent);
        if (isNaN(age) || age < 0 || age > 120) {
          errors.push('Patient age must be between 0 and 120');
        }
      }

      const genderNodes = xpath.select('//ePatient.02', xmlDoc);
      if (genderNodes.length > 0) {
        const gender = genderNodes[0].textContent.trim();
        if (!['M', 'F', 'U'].includes(gender)) {
          errors.push('Patient gender must be M, F, or U');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        valid: false,
        errors: ['Validation error: ' + error.message]
      };
    }
  }

  // Get submission status
  async getSubmissionStatus(submissionId) {
    try {
      const response = await axios.get(`${this.apiEndpoint}/status/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.timeout
      });

      return {
        success: true,
        status: response.data.status,
        timestamp: new Date().toISOString(),
        details: response.data.details
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get validation report
  async getValidationReport(submissionId) {
    try {
      const response = await axios.get(`${this.apiEndpoint}/validation/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.timeout
      });

      return {
        success: true,
        report: response.data.report,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Resubmit corrected record
  async resubmitRecord(submissionId, correctedData) {
    try {
      const response = await axios.post(`${this.apiEndpoint}/resubmit`, {
        submissionId: submissionId,
        correctedData: correctedData
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      return {
        success: true,
        newSubmissionId: response.data.submissionId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get agency statistics
  async getAgencyStatistics(agencyId, startDate, endDate) {
    try {
      const response = await axios.get(`${this.apiEndpoint}/statistics`, {
        params: {
          agencyId: agencyId,
          startDate: startDate,
          endDate: endDate
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.timeout
      });

      return {
        success: true,
        statistics: response.data.statistics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Test connection to VPHIB
  async testConnection() {
    try {
      const response = await axios.get(`${this.apiEndpoint}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });

      return {
        success: true,
        message: 'VPHIB connection successful',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = VPHIBIntegration;