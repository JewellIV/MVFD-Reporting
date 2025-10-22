const axios = require('axios');
const xml2js = require('xml2js');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

class VDFPIntegration {
  constructor() {
    this.apiEndpoint = process.env.VDFP_API_URL || 'https://vdfp.virginia.gov/api';
    this.apiKey = process.env.VDFP_API_KEY;
    this.timeout = 30000; // 30 seconds
  }

  // Submit NERIS record to VDFP
  async submitNerisRecord(nerisData, options = {}) {
    try {
      // Convert to NERIS XML format
      const xmlData = await this.convertToNerisXML(nerisData);
      
      // Validate XML before submission
      const validationResult = await this.validateNerisXML(xmlData);
      if (!validationResult.valid) {
        throw new Error(`NERIS validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Submit to VDFP
      const response = await axios.post(`${this.apiEndpoint}/neris/submit`, {
        xmlData: xmlData,
        agencyId: nerisData.agencyId,
        submissionType: 'NERIS',
        version: '1.0'
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
      console.error('VDFP submission error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Convert NERIS data to XML format
  async convertToNerisXML(nerisData) {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      rootName: 'NERISDataSet',
      headless: false
    });

    const xmlObject = {
      $: {
        'xmlns': 'http://www.neris.org',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.neris.org http://www.neris.org/schemas/neris-v1.0.xsd'
      },
      Incident: [{
        Core: [{
          'IncidentNumber': [nerisData.core?.incidentNumber || ''],
          'IncidentDate': [nerisData.core?.incidentDate || ''],
          'IncidentTypes': [nerisData.core?.incidentTypes || []],
          'IncidentStatus': [nerisData.core?.incidentStatus || 'Active'],
          'IncidentPriority': [nerisData.core?.incidentPriority || 'Medium']
        }],
        Location: [{
          'Address': [{
            'StreetNumber': [nerisData.location?.address?.streetNumber || ''],
            'StreetName': [nerisData.location?.address?.streetName || ''],
            'StreetType': [nerisData.location?.address?.streetType || ''],
            'City': [nerisData.location?.address?.city || ''],
            'State': [nerisData.location?.address?.state || 'VA'],
            'ZipCode': [nerisData.location?.address?.zipCode || ''],
            'Country': [nerisData.location?.address?.country || 'US']
          }],
          'Coordinates': [{
            'Latitude': [nerisData.location?.coordinates?.latitude || ''],
            'Longitude': [nerisData.location?.coordinates?.longitude || ''],
            'Accuracy': [nerisData.location?.coordinates?.accuracy || ''],
            'Altitude': [nerisData.location?.coordinates?.altitude || ''],
            'AltitudeAccuracy': [nerisData.location?.coordinates?.altitudeAccuracy || '']
          }],
          'Geocoding': [{
            'Source': [nerisData.location?.geocoding?.source || ''],
            'Confidence': [nerisData.location?.geocoding?.confidence || ''],
            'Timestamp': [nerisData.location?.geocoding?.timestamp || ''],
            'AddressComponents': [nerisData.location?.geocoding?.addressComponents || {}]
          }],
          'Parcel': [{
            'ParcelId': [nerisData.location?.parcel?.parcelId || ''],
            'Owner': [nerisData.location?.parcel?.owner || ''],
            'PropertyType': [nerisData.location?.parcel?.propertyType || ''],
            'LandUse': [nerisData.location?.parcel?.landUse || ''],
            'BuildingValue': [nerisData.location?.parcel?.buildingValue || ''],
            'LandValue': [nerisData.location?.parcel?.landValue || ''],
            'TotalValue': [nerisData.location?.parcel?.totalValue || ''],
            'YearBuilt': [nerisData.location?.parcel?.yearBuilt || ''],
            'SquareFootage': [nerisData.location?.parcel?.squareFootage || ''],
            'Stories': [nerisData.location?.parcel?.stories || '']
          }],
          'Census': [{
            'Tract': [nerisData.location?.census?.tract || ''],
            'BlockGroup': [nerisData.location?.census?.blockGroup || ''],
            'Block': [nerisData.location?.census?.block || ''],
            'County': [nerisData.location?.census?.county || ''],
            'State': [nerisData.location?.census?.state || 'VA']
          }]
        }],
        Dispatch: [{
          'DispatchTime': [nerisData.dispatch?.dispatchTime || ''],
          'DispatchSource': [nerisData.dispatch?.dispatchSource || ''],
          'DispatchCenter': [nerisData.dispatch?.dispatchCenter || ''],
          'DispatchPersonnel': [nerisData.dispatch?.dispatchPersonnel || ''],
          'InitialCallType': [nerisData.dispatch?.initialCallType || ''],
          'Priority': [nerisData.dispatch?.priority || ''],
          'ResponseMode': [nerisData.dispatch?.responseMode || '']
        }],
        Fire: [{
          'FireSpread': [nerisData.fire?.fireSpread || ''],
          'FlameHeight': [nerisData.fire?.flameHeight || ''],
          'HeatLevel': [nerisData.fire?.heatLevel || ''],
          'SmokeColor': [nerisData.fire?.smokeColor || ''],
          'SmokeDensity': [nerisData.fire?.smokeDensity || ''],
          'WindDirection': [nerisData.fire?.windDirection || ''],
          'WindSpeed': [nerisData.fire?.windSpeed || ''],
          'WeatherConditions': [nerisData.fire?.weatherConditions || ''],
          'Temperature': [nerisData.fire?.temperature || ''],
          'Humidity': [nerisData.fire?.humidity || ''],
          'Tactics': [nerisData.fire?.tactics || {}],
          'Contamination': [nerisData.fire?.contamination || {}]
        }],
        Medical: [{
          'PatientCount': [nerisData.medical?.patientCount || ''],
          'Patients': [nerisData.medical?.patients || []]
        }],
        Hazard: [{
          'HazmatInvolved': [nerisData.hazard?.hazmatInvolved || ''],
          'HazmatClass': [nerisData.hazard?.hazmatClass || ''],
          'HazmatSubclass': [nerisData.hazard?.hazmatSubclass || ''],
          'HazmatName': [nerisData.hazard?.hazmatName || ''],
          'HazmatQuantity': [nerisData.hazard?.hazmatQuantity || ''],
          'HazmatUnits': [nerisData.hazard?.hazmatUnits || ''],
          'HazmatContainer': [nerisData.hazard?.hazmatContainer || ''],
          'HazmatRelease': [nerisData.hazard?.hazmatRelease || ''],
          'HazmatReleaseQuantity': [nerisData.hazard?.hazmatReleaseQuantity || ''],
          'HazmatReleaseUnits': [nerisData.hazard?.hazmatReleaseUnits || ''],
          'HazmatReleaseRate': [nerisData.hazard?.hazmatReleaseRate || ''],
          'HazmatReleaseRateUnits': [nerisData.hazard?.hazmatReleaseRateUnits || ''],
          'HazmatReleaseDuration': [nerisData.hazard?.hazmatReleaseDuration || ''],
          'HazmatReleaseDurationUnits': [nerisData.hazard?.hazmatReleaseDurationUnits || ''],
          'HazmatReleaseArea': [nerisData.hazard?.hazmatReleaseArea || ''],
          'HazmatReleaseAreaUnits': [nerisData.hazard?.hazmatReleaseAreaUnits || ''],
          'HazmatReleaseVolume': [nerisData.hazard?.hazmatReleaseVolume || ''],
          'HazmatReleaseVolumeUnits': [nerisData.hazard?.hazmatReleaseVolumeUnits || ''],
          'HazmatReleaseWeight': [nerisData.hazard?.hazmatReleaseWeight || ''],
          'HazmatReleaseWeightUnits': [nerisData.hazard?.hazmatReleaseWeightUnits || ''],
          'HazmatReleasePressure': [nerisData.hazard?.hazmatReleasePressure || ''],
          'HazmatReleasePressureUnits': [nerisData.hazard?.hazmatReleasePressureUnits || ''],
          'HazmatReleaseTemperature': [nerisData.hazard?.hazmatReleaseTemperature || ''],
          'HazmatReleaseTemperatureUnits': [nerisData.hazard?.hazmatReleaseTemperatureUnits || ''],
          'HazmatReleaseDensity': [nerisData.hazard?.hazmatReleaseDensity || ''],
          'HazmatReleaseDensityUnits': [nerisData.hazard?.hazmatReleaseDensityUnits || ''],
          'HazmatReleaseViscosity': [nerisData.hazard?.hazmatReleaseViscosity || ''],
          'HazmatReleaseViscosityUnits': [nerisData.hazard?.hazmatReleaseViscosityUnits || ''],
          'HazmatReleasepH': [nerisData.hazard?.hazmatReleasepH || ''],
          'HazmatReleasepHUnits': [nerisData.hazard?.hazmatReleasepHUnits || ''],
          'HazmatReleaseConcentration': [nerisData.hazard?.hazmatReleaseConcentration || ''],
          'HazmatReleaseConcentrationUnits': [nerisData.hazard?.hazmatReleaseConcentrationUnits || ''],
          'HazmatReleasePurity': [nerisData.hazard?.hazmatReleasePurity || ''],
          'HazmatReleasePurityUnits': [nerisData.hazard?.hazmatReleasePurityUnits || ''],
          'HazmatReleaseSolubility': [nerisData.hazard?.hazmatReleaseSolubility || ''],
          'HazmatReleaseSolubilityUnits': [nerisData.hazard?.hazmatReleaseSolubilityUnits || ''],
          'HazmatReleaseStability': [nerisData.hazard?.hazmatReleaseStability || ''],
          'HazmatReleaseStabilityUnits': [nerisData.hazard?.hazmatReleaseStabilityUnits || ''],
          'HazmatReleaseReactivity': [nerisData.hazard?.hazmatReleaseReactivity || ''],
          'HazmatReleaseReactivityUnits': [nerisData.hazard?.hazmatReleaseReactivityUnits || ''],
          'HazmatReleaseToxicity': [nerisData.hazard?.hazmatReleaseToxicity || ''],
          'HazmatReleaseToxicityUnits': [nerisData.hazard?.hazmatReleaseToxicityUnits || ''],
          'HazmatReleaseFlammability': [nerisData.hazard?.hazmatReleaseFlammability || ''],
          'HazmatReleaseFlammabilityUnits': [nerisData.hazard?.hazmatReleaseFlammabilityUnits || ''],
          'HazmatReleaseCorrosivity': [nerisData.hazard?.hazmatReleaseCorrosivity || ''],
          'HazmatReleaseCorrosivityUnits': [nerisData.hazard?.hazmatReleaseCorrosivityUnits || ''],
          'HazmatReleaseOxidizing': [nerisData.hazard?.hazmatReleaseOxidizing || ''],
          'HazmatReleaseOxidizingUnits': [nerisData.hazard?.hazmatReleaseOxidizingUnits || ''],
          'HazmatReleaseReducing': [nerisData.hazard?.hazmatReleaseReducing || ''],
          'HazmatReleaseReducingUnits': [nerisData.hazard?.hazmatReleaseReducingUnits || ''],
          'HazmatReleaseRadioactive': [nerisData.hazard?.hazmatReleaseRadioactive || ''],
          'HazmatReleaseRadioactiveUnits': [nerisData.hazard?.hazmatReleaseRadioactiveUnits || ''],
          'HazmatReleaseBiological': [nerisData.hazard?.hazmatReleaseBiological || ''],
          'HazmatReleaseBiologicalUnits': [nerisData.hazard?.hazmatReleaseBiologicalUnits || ''],
          'HazmatReleaseOther': [nerisData.hazard?.hazmatReleaseOther || ''],
          'HazmatReleaseOtherUnits': [nerisData.hazard?.hazmatReleaseOtherUnits || '']
        }],
        Rescue: [{
          'RescueType': [nerisData.rescue?.rescueType || ''],
          'RescueMethod': [nerisData.rescue?.rescueMethod || ''],
          'RescueEquipment': [nerisData.rescue?.rescueEquipment || []],
          'RescuePersonnel': [nerisData.rescue?.rescuePersonnel || ''],
          'RescueDuration': [nerisData.rescue?.rescueDuration || ''],
          'RescueSuccess': [nerisData.rescue?.rescueSuccess || ''],
          'VictimsRescued': [nerisData.rescue?.victimsRescued || ''],
          'VictimsInjured': [nerisData.rescue?.victimsInjured || ''],
          'VictimsFatalities': [nerisData.rescue?.victimsFatalities || '']
        }],
        Exposure: [{
          'ExposureType': [nerisData.exposure?.exposureType || ''],
          'ExposureSource': [nerisData.exposure?.exposureSource || ''],
          'ExposureDuration': [nerisData.exposure?.exposureDuration || ''],
          'ExposureUnits': [nerisData.exposure?.exposureUnits || ''],
          'ExposureLevel': [nerisData.exposure?.exposureLevel || ''],
          'ExposureUnits2': [nerisData.exposure?.exposureUnits2 || ''],
          'ExposureRoute': [nerisData.exposure?.exposureRoute || ''],
          'ExposureProtection': [nerisData.exposure?.exposureProtection || ''],
          'ExposureSymptoms': [nerisData.exposure?.exposureSymptoms || []],
          'ExposureTreatment': [nerisData.exposure?.exposureTreatment || []],
          'ExposureFollowUp': [nerisData.exposure?.exposureFollowUp || '']
        }],
        UnitResponse: [nerisData.unitResponse || []],
        Weather: [{
          'Temperature': [nerisData.weather?.temperature || ''],
          'Humidity': [nerisData.weather?.humidity || ''],
          'WindSpeed': [nerisData.weather?.windSpeed || ''],
          'WindDirection': [nerisData.weather?.windDirection || ''],
          'Visibility': [nerisData.weather?.visibility || ''],
          'Precipitation': [nerisData.weather?.precipitation || ''],
          'CloudCover': [nerisData.weather?.cloudCover || ''],
          'Pressure': [nerisData.weather?.pressure || ''],
          'DewPoint': [nerisData.weather?.dewPoint || ''],
          'HeatIndex': [nerisData.weather?.heatIndex || ''],
          'WindChill': [nerisData.weather?.windChill || ''],
          'WeatherCondition': [nerisData.weather?.weatherCondition || ''],
          'WeatherHazard': [nerisData.weather?.weatherHazard || []]
        }],
        Augmentation: [{
          'CustomFields': [nerisData.augmentation?.customFields || {}],
          'ExternalSystems': [nerisData.augmentation?.externalSystems || []]
        }]
      }]
    };

    return builder.buildObject(xmlObject);
  }

  // Validate NERIS XML
  async validateNerisXML(xmlData) {
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
        'IncidentNumber',
        'IncidentDate',
        'IncidentTypes',
        'Latitude',
        'Longitude'
      ];

      for (const element of requiredElements) {
        const nodes = xpath.select(`//${element}`, xmlDoc);
        if (nodes.length === 0 || !nodes[0].textContent.trim()) {
          errors.push(`Required element ${element} is missing or empty`);
        }
      }

      // Virginia-specific validation
      const vaSpecificElements = [
        'State', // Must be VA
        'ZipCode'
      ];

      for (const element of vaSpecificElements) {
        const nodes = xpath.select(`//${element}`, xmlDoc);
        if (nodes.length === 0 || !nodes[0].textContent.trim()) {
          warnings.push(`Virginia-specific element ${element} is missing`);
        }
      }

      // GIS validation
      const latNodes = xpath.select('//Latitude', xmlDoc);
      const lonNodes = xpath.select('//Longitude', xmlDoc);
      
      if (latNodes.length > 0 && lonNodes.length > 0) {
        const lat = parseFloat(latNodes[0].textContent);
        const lon = parseFloat(lonNodes[0].textContent);
        
        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push('Latitude must be between -90 and 90');
        }
        
        if (isNaN(lon) || lon < -180 || lon > 180) {
          errors.push('Longitude must be between -180 and 180');
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
      const response = await axios.get(`${this.apiEndpoint}/neris/status/${submissionId}`, {
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
      const response = await axios.get(`${this.apiEndpoint}/neris/validation/${submissionId}`, {
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
      const response = await axios.post(`${this.apiEndpoint}/neris/resubmit`, {
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
      const response = await axios.get(`${this.apiEndpoint}/neris/statistics`, {
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

  // Test connection to VDFP
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
        message: 'VDFP connection successful',
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

module.exports = VDFPIntegration;