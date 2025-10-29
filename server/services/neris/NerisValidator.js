const NerisSchemaService = require('./NerisSchemaService');

/**
 * NERIS Validator Service
 * 
 * Validates NERIS records against the framework schemas
 */
class NerisValidator {
  constructor() {
    this.schemaService = NerisSchemaService;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Initialize the validator
   */
  async initialize() {
    await this.schemaService.initialize();
  }

  /**
   * Validate a NERIS record
   */
  async validate(nerisRecord) {
    this.errors = [];
    this.warnings = [];

    // Validate core incident data
    this.validateCoreIncident(nerisRecord);
    
    // Validate incident type
    if (nerisRecord.core && nerisRecord.core.incident_final_type) {
      this.validateIncidentTypes(nerisRecord);
    }

    // Validate location
    if (nerisRecord.location) {
      this.validateLocation(nerisRecord.location);
    }

    // Validate dispatch
    if (nerisRecord.dispatch) {
      this.validateDispatch(nerisRecord.dispatch);
    }

    // Validate incident-type-specific modules
    if (nerisRecord.core && nerisRecord.core.incident_final_type && nerisRecord.core.incident_final_type.length > 0) {
      const primaryType = nerisRecord.core.incident_final_type.find(t => t.primary === true) || nerisRecord.core.incident_final_type[0];
      
      if (primaryType) {
        this.validateIncidentTypeSpecificData(nerisRecord, primaryType);
      }
    }

    // Validate unit response
    if (nerisRecord.unitResponse && Array.isArray(nerisRecord.unitResponse)) {
      nerisRecord.unitResponse.forEach((unit, index) => {
        this.validateUnitResponse(unit, index);
      });
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      score: this.calculateQualityScore()
    };
  }

  /**
   * Validate core incident data
   */
  validateCoreIncident(record) {
    const requiredFields = this.schemaService.getRequiredFields('incident', 'core_mod_incident');
    
    if (!record.core) {
      this.addError('core', 'Core incident data is required');
      return;
    }

    // Check required fields
    for (const field of requiredFields) {
      if (!record.core[field.name]) {
        this.addError(`core.${field.name}`, `${field.name} is required for core incident data`);
      }
    }

    // Validate incident_neris_id format
    if (record.core.incident_neris_id) {
      if (!/^[A-Z]{2}\d+:?\d+$/.test(record.core.incident_neris_id)) {
        this.addError('core.incident_neris_id', 'Invalid NERIS ID format. Expected format: FD00000000:1714762619');
      }
    }

    // Validate incident internal ID
    if (record.core.incident_internal_id) {
      if (record.core.incident_internal_id.length > 255) {
        this.addError('core.incident_internal_id', 'Incident internal ID must be 255 characters or less');
      }
    }
  }

  /**
   * Validate incident types
   */
  validateIncidentTypes(record) {
    if (!Array.isArray(record.core.incident_final_type)) {
      this.addError('core.incident_final_type', 'Incident types must be an array');
      return;
    }

    let hasPrimary = false;

    for (let i = 0; i < record.core.incident_final_type.length; i++) {
      const type = record.core.incident_final_type[i];
      
      if (!type.value_1 || !type.value_2 || !type.value_3) {
        this.addError(`core.incident_final_type[${i}]`, 'Each incident type must have value_1, value_2, and value_3');
        continue;
      }

      const validation = this.schemaService.validateIncidentType(type);
      if (!validation.valid) {
        this.addError(`core.incident_final_type[${i}]`, validation.error);
      }

      if (type.primary === true) {
        if (hasPrimary) {
          this.addError(`core.incident_final_type[${i}]`, 'Only one incident type can be primary');
        }
        hasPrimary = true;
      }
    }
  }

  /**
   * Validate location data
   */
  validateLocation(location) {
    const locationFields = this.schemaService.getCivicLocationFields();

    // Validate coordinates if provided
    if (location.point) {
      if (!location.point.latitude || !location.point.longitude) {
        this.addError('location.point', 'Location point must have latitude and longitude');
      } else {
        if (location.point.latitude < -90 || location.point.latitude > 90) {
          this.addError('location.point.latitude', 'Latitude must be between -90 and 90');
        }
        if (location.point.longitude < -180 || location.point.longitude > 180) {
          this.addError('location.point.longitude', 'Longitude must be between -180 and 180');
        }
      }
    }

    // Validate address number
    if (location.an_number !== undefined && location.an_number !== null) {
      if (!Number.isInteger(location.an_number)) {
        this.addError('location.an_number', 'Address number must be an integer');
      }
    }

    // Validate state code
    if (location.csop_state) {
      if (!/^[A-Z]{2}$/.test(location.csop_state)) {
        this.addError('location.csop_state', 'State must be a 2-letter uppercase code');
      }
    }

    // Validate postal code
    if (location.csop_postal_code) {
      if (!/^\d{5}(-\d{4})?$/.test(location.csop_postal_code)) {
        this.addWarning('location.csop_postal_code', 'Postal code should be in format 12345 or 12345-1234');
      }
    }
  }

  /**
   * Validate dispatch data
   */
  validateDispatch(dispatch) {
    const dispatchFields = this.schemaService.getDispatchModuleFields();

    // Validate timestamps
    const requiredTimestamps = [
      'dispatch_time_call_arrival',
      'dispatch_time_call_answering',
      'dispatch_time_call_create'
    ];

    for (const timestamp of requiredTimestamps) {
      if (!dispatch[timestamp]) {
        this.addError(`dispatch.${timestamp}`, `${timestamp} is required`);
      } else if (!this.isValidISO8601(dispatch[timestamp])) {
        this.addError(`dispatch.${timestamp}`, `${timestamp} must be a valid ISO 8601 datetime`);
      }
    }

    // Validate dispatch center ID
    if (dispatch.dispatch_center_id) {
      if (!/^\d{4}$/.test(dispatch.dispatch_center_id)) {
        this.addError('dispatch.dispatch_center_id', 'Dispatch center ID must be a 4-digit string');
      }
    }
  }

  /**
   * Validate incident-type-specific data
   */
  validateIncidentTypeSpecificData(record, incidentType) {
    if (incidentType.value_1 === 'FIRE' && record.fire) {
      this.validateFireData(record.fire, incidentType);
    }

    if (incidentType.value_1 === 'MEDICAL' && record.medical) {
      if (Array.isArray(record.medical)) {
        record.medical.forEach((med, index) => {
          this.validateMedicalData(med, index);
        });
      } else {
        this.addError('medical', 'Medical data must be an array');
      }
    }

    if (incidentType.value_1 === 'HAZSIT' && record.hazard) {
      this.validateHazardData(record.hazard);
    }
  }

  /**
   * Validate fire incident data
   */
  validateFireData(fire, incidentType) {
    const fireFields = this.schemaService.getFireModuleFields();

    // For structure fires, validate structure-specific fields
    if (incidentType.value_2 === 'STRUCTURE_FIRE') {
      if (!fire.structure_damage) {
        this.addError('fire.structure_damage', 'Structure damage is required for structure fires');
      }

      if (fire.structure_floor_of_origin !== undefined && fire.structure_floor_of_origin !== null) {
        if (!Number.isInteger(fire.structure_floor_of_origin)) {
          this.addError('fire.structure_floor_of_origin', 'Floor of origin must be an integer');
        }
      }
    }

    // For outdoor fires, validate outdoor-specific fields
    if (incidentType.value_2 === 'OUTSIDE_FIRE') {
      if (fire.outside_fire_acres_burned !== undefined && fire.outside_fire_acres_burned !== null) {
        if (typeof fire.outside_fire_acres_burned !== 'number' || fire.outside_fire_acres_burned < 0) {
          this.addError('fire.outside_fire_acres_burned', 'Acres burned must be a non-negative number');
        }
      }
    }
  }

  /**
   * Validate medical incident data
   */
  validateMedicalData(medical, index) {
    // Add medical-specific validation here
    // For now, basic structure validation
    
    if (!medical.patient_count) {
      this.addWarning(`medical[${index}].patient_count`, 'Patient count should be provided for medical incidents');
    }
  }

  /**
   * Validate hazard incident data
   */
  validateHazardData(hazard) {
    const hazardFields = this.schemaService.getHazardModuleFields();
    
    // Add hazard-specific validation here
  }

  /**
   * Validate unit response data
   */
  validateUnitResponse(unit, index) {
    const unitFields = this.schemaService.getUnitResponseFields();

    // Validate required timestamps
    const requiredTimestamps = ['time_dispatch', 'time_enroute_to_scene', 'time_on_scene', 'time_unit_clear'];
    
    for (const timestamp of requiredTimestamps) {
      if (!unit[timestamp]) {
        this.addError(`unitResponse[${index}].${timestamp}`, `${timestamp} is required for unit response`);
      } else if (!this.isValidISO8601(unit[timestamp])) {
        this.addError(`unitResponse[${index}].${timestamp}`, `${timestamp} must be a valid ISO 8601 datetime`);
      }
    }

    // Validate unit ID
    if (!unit.unit_id_linked && !unit.unit_id_reported) {
      this.addError(`unitResponse[${index}]`, 'Either unit_id_linked or unit_id_reported must be provided');
    }

    // Validate response mode
    if (unit.unit_response_mode) {
      const validModes = this.schemaService.getValueSet('type_response_mode');
      const modeExists = validModes.some(m => m.value === unit.unit_response_mode);
      
      if (!modeExists) {
        this.addError(`unitResponse[${index}].unit_response_mode`, `Invalid response mode: ${unit.unit_response_mode}`);
      }
    }

    // Validate staffing
    if (unit.unit_staffing_reported !== undefined && unit.unit_staffing_reported !== null) {
      if (!Number.isInteger(unit.unit_staffing_reported) || unit.unit_staffing_reported < 0) {
        this.addError(`unitResponse[${index}].unit_staffing_reported`, 'Unit staffing must be a non-negative integer');
      }
    }
  }

  /**
   * Calculate data quality score
   */
  calculateQualityScore() {
    const totalChecks = this.errors.length + this.warnings.length;
    
    if (totalChecks === 0) {
      return 100;
    }

    const errorWeight = 5;
    const warningWeight = 1;
    const deductedPoints = (this.errors.length * errorWeight) + (this.warnings.length * warningWeight);
    
    return Math.max(0, 100 - deductedPoints);
  }

  /**
   * Add validation error
   */
  addError(field, message) {
    this.errors.push({
      field,
      message,
      level: 'error'
    });
  }

  /**
   * Add validation warning
   */
  addWarning(field, message) {
    this.warnings.push({
      field,
      message,
      level: 'warning'
    });
  }

  /**
   * Check if string is valid ISO 8601 datetime
   */
  isValidISO8601(dateString) {
    if (typeof dateString !== 'string') return false;
    
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)$/;
    return iso8601Regex.test(dateString) && !isNaN(new Date(dateString).getTime());
  }
}

module.exports = NerisValidator;
