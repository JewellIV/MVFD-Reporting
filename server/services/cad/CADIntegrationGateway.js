const axios = require('axios');
const xml2js = require('xml2js');
const { DOMParser } = require('xmldom');
const xpath = require('xpath');

class CADIntegrationGateway {
  constructor() {
    this.adapters = new Map();
    this.initializeAdapters();
  }

  // Initialize CAD adapters
  initializeAdapters() {
    // APCO EIDD Adapter
    this.adapters.set('apco-eidd', new APCOEIDDAdapter());
    
    // NENA i3 (EIDO) Adapter
    this.adapters.set('nena-i3', new NENAI3Adapter());
    
    // CentralSquare Adapter
    this.adapters.set('centralsquare', new CentralSquareAdapter());
    
    // Hexagon Adapter
    this.adapters.set('hexagon', new HexagonAdapter());
    
    // Tyler Technologies Adapter
    this.adapters.set('tyler', new TylerAdapter());
    
    // ZOLL Adapter
    this.adapters.set('zoll', new ZOLLAdapter());
    
    // Generic REST API Adapter
    this.adapters.set('rest-api', new RestAPIAdapter());
  }

  // Process incoming CAD data
  async processCADData(data, sourceType, options = {}) {
    try {
      const adapter = this.adapters.get(sourceType);
      if (!adapter) {
        throw new Error(`Unsupported CAD source type: ${sourceType}`);
      }

      // Parse and normalize the data
      const normalizedData = await adapter.parse(data, options);
      
      // Validate the data
      const validationResult = await this.validateCADData(normalizedData);
      if (!validationResult.valid) {
        throw new Error(`CAD data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Enrich with external data
      const enrichedData = await this.enrichWithExternalData(normalizedData);

      return {
        success: true,
        data: enrichedData,
        source: sourceType,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('CAD Integration Gateway Error:', error);
      return {
        success: false,
        error: error.message,
        source: sourceType,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Validate CAD data
  async validateCADData(data) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!data.incidentNumber) {
      errors.push('Incident number is required');
    }

    if (!data.incidentType) {
      errors.push('Incident type is required');
    }

    if (!data.location) {
      errors.push('Location information is required');
    }

    if (!data.dispatchTime) {
      errors.push('Dispatch time is required');
    }

    // Location validation
    if (data.location && (!data.location.latitude || !data.location.longitude)) {
      warnings.push('Geographic coordinates are missing - geocoding will be attempted');
    }

    // Time validation
    if (data.dispatchTime && data.arrivalTime) {
      const dispatchTime = new Date(data.dispatchTime);
      const arrivalTime = new Date(data.arrivalTime);
      
      if (arrivalTime < dispatchTime) {
        errors.push('Arrival time cannot be before dispatch time');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Enrich data with external sources
  async enrichWithExternalData(data) {
    const enrichedData = { ...data };

    try {
      // Weather data
      if (data.location && data.location.latitude && data.location.longitude) {
        const weatherData = await this.getWeatherData(
          data.location.latitude,
          data.location.longitude,
          data.dispatchTime
        );
        enrichedData.weather = weatherData;
      }

      // GIS/Parcel data
      if (data.location && data.location.latitude && data.location.longitude) {
        const parcelData = await this.getParcelData(
          data.location.latitude,
          data.location.longitude
        );
        enrichedData.parcel = parcelData;
      }

      // Census data
      if (data.location && data.location.latitude && data.location.longitude) {
        const censusData = await this.getCensusData(
          data.location.latitude,
          data.location.longitude
        );
        enrichedData.census = censusData;
      }

    } catch (error) {
      console.error('Error enriching data:', error);
      // Continue without enrichment data
    }

    return enrichedData;
  }

  // Get weather data from National Weather Service
  async getWeatherData(latitude, longitude, timestamp) {
    try {
      const response = await axios.get('https://api.weather.gov/points/' + latitude + ',' + longitude);
      const forecastUrl = response.data.properties.forecast;
      
      const forecastResponse = await axios.get(forecastUrl);
      const periods = forecastResponse.data.properties.periods;
      
      // Find the period that matches the incident time
      const incidentDate = new Date(timestamp);
      const incidentHour = incidentDate.getHours();
      
      const period = periods.find(p => {
        const periodStart = new Date(p.startTime);
        const periodEnd = new Date(p.endTime);
        return incidentDate >= periodStart && incidentDate <= periodEnd;
      }) || periods[0];

      return {
        temperature: period.temperature,
        temperatureUnit: period.temperatureUnit,
        windSpeed: period.windSpeed,
        windDirection: period.windDirection,
        shortForecast: period.shortForecast,
        detailedForecast: period.detailedForecast,
        icon: period.icon,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  // Get parcel data from GIS service
  async getParcelData(latitude, longitude) {
    try {
      // This would integrate with your local GIS service
      // For now, return mock data
      return {
        parcelId: 'PARCEL-' + Math.random().toString(36).substr(2, 9),
        owner: 'Property Owner',
        propertyType: 'Residential',
        landUse: 'Single Family',
        buildingValue: 250000,
        landValue: 50000,
        totalValue: 300000,
        yearBuilt: 1995,
        squareFootage: 2000,
        stories: 2,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching parcel data:', error);
      return null;
    }
  }

  // Get census data
  async getCensusData(latitude, longitude) {
    try {
      // This would integrate with Census API
      // For now, return mock data
      return {
        tract: '1234.56',
        blockGroup: '1',
        block: '1234',
        county: 'Example County',
        state: 'VA',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error fetching census data:', error);
      return null;
    }
  }

  // Get supported CAD systems
  getSupportedSystems() {
    return Array.from(this.adapters.keys());
  }

  // Test connection to CAD system
  async testConnection(sourceType, config) {
    try {
      const adapter = this.adapters.get(sourceType);
      if (!adapter) {
        throw new Error(`Unsupported CAD source type: ${sourceType}`);
      }

      return await adapter.testConnection(config);
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Base CAD Adapter Class
class BaseCADAdapter {
  async parse(data, options) {
    throw new Error('parse method must be implemented');
  }

  async testConnection(config) {
    throw new Error('testConnection method must be implemented');
  }
}

// APCO EIDD Adapter
class APCOEIDDAdapter extends BaseCADAdapter {
  async parse(xmlData, options) {
    try {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(xmlData);
      
      // Extract data from EIDD XML structure
      const eidd = result.EIDD;
      const incident = eidd.Incident[0];
      
      return {
        incidentNumber: incident.IncidentNumber[0],
        incidentType: incident.IncidentType[0],
        location: {
          address: incident.Location[0].Address[0],
          city: incident.Location[0].City[0],
          state: incident.Location[0].State[0],
          zipCode: incident.Location[0].ZipCode[0],
          latitude: parseFloat(incident.Location[0].Latitude[0]),
          longitude: parseFloat(incident.Location[0].Longitude[0])
        },
        dispatchTime: new Date(incident.DispatchTime[0]),
        enRouteTime: incident.EnRouteTime ? new Date(incident.EnRouteTime[0]) : null,
        arrivalTime: incident.ArrivalTime ? new Date(incident.ArrivalTime[0]) : null,
        clearTime: incident.ClearTime ? new Date(incident.ClearTime[0]) : null,
        units: incident.Units ? incident.Units[0].Unit.map(unit => ({
          unitId: unit.UnitID[0],
          unitType: unit.UnitType[0],
          status: unit.Status[0]
        })) : []
      };

    } catch (error) {
      throw new Error(`APCO EIDD parsing failed: ${error.message}`);
    }
  }

  async testConnection(config) {
    // Test EIDD endpoint
    try {
      const response = await axios.get(config.eiddEndpoint, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'EIDD connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// NENA i3 (EIDO) Adapter
class NENAI3Adapter extends BaseCADAdapter {
  async parse(jsonData, options) {
    try {
      const eido = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      return {
        incidentNumber: eido.incidentNumber,
        incidentType: eido.incidentType,
        location: {
          address: eido.location.address,
          city: eido.location.city,
          state: eido.location.state,
          zipCode: eido.location.zipCode,
          latitude: eido.location.latitude,
          longitude: eido.location.longitude
        },
        dispatchTime: new Date(eido.dispatchTime),
        enRouteTime: eido.enRouteTime ? new Date(eido.enRouteTime) : null,
        arrivalTime: eido.arrivalTime ? new Date(eido.arrivalTime) : null,
        clearTime: eido.clearTime ? new Date(eido.clearTime) : null,
        units: eido.units || []
      };

    } catch (error) {
      throw new Error(`NENA i3 parsing failed: ${error.message}`);
    }
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.eidoEndpoint, {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'NENA i3 connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CentralSquare Adapter
class CentralSquareAdapter extends BaseCADAdapter {
  async parse(data, options) {
    // CentralSquare specific parsing logic
    return this.normalizeData(data);
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.apiEndpoint + '/status', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'CentralSquare connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Normalize CentralSquare data to standard format
    return {
      incidentNumber: data.incident_id,
      incidentType: data.call_type,
      location: {
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip,
        latitude: data.latitude,
        longitude: data.longitude
      },
      dispatchTime: new Date(data.dispatch_time),
      enRouteTime: data.enroute_time ? new Date(data.enroute_time) : null,
      arrivalTime: data.arrival_time ? new Date(data.arrival_time) : null,
      clearTime: data.clear_time ? new Date(data.clear_time) : null,
      units: data.units || []
    };
  }
}

// Hexagon Adapter
class HexagonAdapter extends BaseCADAdapter {
  async parse(data, options) {
    // Hexagon specific parsing logic
    return this.normalizeData(data);
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.apiEndpoint + '/health', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'Hexagon connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Normalize Hexagon data to standard format
    return {
      incidentNumber: data.incidentNumber,
      incidentType: data.incidentType,
      location: {
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
        zipCode: data.location.zipCode,
        latitude: data.location.latitude,
        longitude: data.location.longitude
      },
      dispatchTime: new Date(data.dispatchTime),
      enRouteTime: data.enRouteTime ? new Date(data.enRouteTime) : null,
      arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
      clearTime: data.clearTime ? new Date(data.clearTime) : null,
      units: data.units || []
    };
  }
}

// Tyler Technologies Adapter
class TylerAdapter extends BaseCADAdapter {
  async parse(data, options) {
    // Tyler specific parsing logic
    return this.normalizeData(data);
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.apiEndpoint + '/status', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'Tyler Technologies connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Normalize Tyler data to standard format
    return {
      incidentNumber: data.incidentNumber,
      incidentType: data.incidentType,
      location: {
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
        zipCode: data.location.zipCode,
        latitude: data.location.latitude,
        longitude: data.location.longitude
      },
      dispatchTime: new Date(data.dispatchTime),
      enRouteTime: data.enRouteTime ? new Date(data.enRouteTime) : null,
      arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
      clearTime: data.clearTime ? new Date(data.clearTime) : null,
      units: data.units || []
    };
  }
}

// ZOLL Adapter
class ZOLLAdapter extends BaseCADAdapter {
  async parse(data, options) {
    // ZOLL specific parsing logic
    return this.normalizeData(data);
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.apiEndpoint + '/status', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'ZOLL connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Normalize ZOLL data to standard format
    return {
      incidentNumber: data.incidentNumber,
      incidentType: data.incidentType,
      location: {
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
        zipCode: data.location.zipCode,
        latitude: data.location.latitude,
        longitude: data.location.longitude
      },
      dispatchTime: new Date(data.dispatchTime),
      enRouteTime: data.enRouteTime ? new Date(data.enRouteTime) : null,
      arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : null,
      clearTime: data.clearTime ? new Date(data.clearTime) : null,
      units: data.units || []
    };
  }
}

// Generic REST API Adapter
class RestAPIAdapter extends BaseCADAdapter {
  async parse(data, options) {
    // Generic REST API parsing logic
    return this.normalizeData(data);
  }

  async testConnection(config) {
    try {
      const response = await axios.get(config.apiEndpoint + '/health', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        }
      });
      
      return {
        success: true,
        message: 'REST API connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  normalizeData(data) {
    // Normalize generic REST API data to standard format
    return {
      incidentNumber: data.incidentNumber || data.incident_number,
      incidentType: data.incidentType || data.incident_type,
      location: {
        address: data.location?.address || data.address,
        city: data.location?.city || data.city,
        state: data.location?.state || data.state,
        zipCode: data.location?.zipCode || data.zipCode || data.zip,
        latitude: data.location?.latitude || data.latitude,
        longitude: data.location?.longitude || data.longitude
      },
      dispatchTime: new Date(data.dispatchTime || data.dispatch_time),
      enRouteTime: data.enRouteTime || data.en_route_time ? new Date(data.enRouteTime || data.en_route_time) : null,
      arrivalTime: data.arrivalTime || data.arrival_time ? new Date(data.arrivalTime || data.arrival_time) : null,
      clearTime: data.clearTime || data.clear_time ? new Date(data.clearTime || data.clear_time) : null,
      units: data.units || []
    };
  }
}

module.exports = CADIntegrationGateway;