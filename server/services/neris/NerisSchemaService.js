const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const csv = require('csv-parse/sync');

/**
 * NERIS Schema Service
 * 
 * Parses and provides access to NERIS framework schemas including:
 * - Core modules (incident, entity, dispatch)
 * - Value sets (incident types, units, etc.)
 * - Mappings (dispatch codes, location mappings)
 * - Secondary schemas (CRR, health and safety, incident analysis)
 */
class NerisSchemaService {
  constructor() {
    this.schemasPath = path.join(__dirname, 'schemas');
    this.mappingsPath = path.join(__dirname, 'mappings');
    this.coreModules = {};
    this.secondaryModules = {};
    this.valueSets = {};
    this.mappings = {};
    this.loaded = false;
  }

  /**
   * Initialize the service by loading all schema files
   */
  async initialize() {
    if (this.loaded) return;

    try {
      await Promise.all([
        this.loadCoreModules(),
        this.loadSecondaryModules(),
        this.loadValueSets(),
        this.loadMappings()
      ]);

      this.loaded = true;
      console.log('✅ NERIS Schema Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NERIS Schema Service:', error);
      throw error;
    }
  }

  /**
   * Load core modules from CSV files
   */
  async loadCoreModules() {
    const modulesPath = path.join(this.schemasPath, 'core_schemas', 'modules', 'csv');
    const moduleTypes = ['incident', 'entity', 'dispatch', 'augmentation', 'shared'];

    for (const moduleType of moduleTypes) {
      const typePath = path.join(modulesPath, moduleType);
      
      try {
        const files = await fs.readdir(typePath);
        this.coreModules[moduleType] = {};

        for (const file of files) {
          if (file.endsWith('.csv')) {
            const filePath = path.join(typePath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const records = csv.parse(content, { 
              columns: true, 
              skip_empty_lines: true,
              trim: true
            });
            
            const moduleName = file.replace('.csv', '');
            this.coreModules[moduleType][moduleName] = records;
          }
        }
      } catch (error) {
        // Directory doesn't exist or no files
        console.warn(`Warning: Could not load ${moduleType} modules:`, error.message);
      }
    }
  }

  /**
   * Load secondary modules
   */
  async loadSecondaryModules() {
    const modulesPath = path.join(this.schemasPath, 'secondary_schemas', 'modules', 'csv');

    try {
      const categories = await fs.readdir(modulesPath);
      
      for (const category of categories) {
        const categoryPath = path.join(modulesPath, category);
        const files = await fs.readdir(categoryPath);
        
        this.secondaryModules[category] = {};
        
        for (const file of files) {
          if (file.endsWith('.csv')) {
            const filePath = path.join(categoryPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const records = csv.parse(content, { 
              columns: true, 
              skip_empty_lines: true,
              trim: true
            });
            
            const moduleName = file.replace('.csv', '');
            this.secondaryModules[category][moduleName] = records;
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load secondary modules:', error.message);
    }
  }

  /**
   * Load value sets
   */
  async loadValueSets() {
    const valueSetsPath = path.join(this.schemasPath, 'core_schemas', 'value_sets', 'csv');

    try {
      const files = await fs.readdir(valueSetsPath);
      
      for (const file of files) {
        if (file.endsWith('.csv') && !file.includes('system')) {
          const filePath = path.join(valueSetsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const records = csv.parse(content, { 
            columns: true, 
            skip_empty_lines: true,
            trim: true
          });
          
          const setName = file.replace('.csv', '');
          this.valueSets[setName] = records;
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load value sets:', error.message);
    }
  }

  /**
   * Load mappings
   */
  async loadMappings() {
    try {
      const files = await fs.readdir(this.mappingsPath);
      
      for (const file of files) {
        if (file.endsWith('.csv')) {
          const filePath = path.join(this.mappingsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const records = csv.parse(content, { 
            columns: true, 
            skip_empty_lines: true,
            trim: true
          });
          
          const mappingName = file.replace('.csv', '');
          this.mappings[mappingName] = records;
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load mappings:', error.message);
    }
  }

  /**
   * Get a specific module
   */
  getModule(moduleType, moduleName) {
    if (!this.loaded) {
      throw new Error('NerisSchemaService not initialized. Call initialize() first.');
    }
    
    if (this.coreModules[moduleType] && this.coreModules[moduleType][moduleName]) {
      return this.coreModules[moduleType][moduleName];
    }
    
    return null;
  }

  /**
   * Get incident types
   */
  getIncidentTypes() {
    if (!this.loaded) {
      throw new Error('NerisSchemaService not initialized. Call initialize() first.');
    }
    
    return this.valueSets.type_incident || [];
  }

  /**
   * Get fire module fields
   */
  getFireModuleFields() {
    return this.getModule('incident', 'mod_fire') || [];
  }

  /**
   * Get medical module fields
   */
  getMedicalModuleFields() {
    return this.getModule('incident', 'mod_medical') || [];
  }

  /**
   * Get hazard module fields
   */
  getHazardModuleFields() {
    return this.getModule('incident', 'mod_hazard') || [];
  }

  /**
   * Get unit response module fields
   */
  getUnitResponseFields() {
    return this.getModule('shared', 'mod_unit_response') || [];
  }

  /**
   * Get civic location fields
   */
  getCivicLocationFields() {
    return this.getModule('shared', 'mod_civic_location') || [];
  }

  /**
   * Get value set by name
   */
  getValueSet(setName) {
    if (!this.loaded) {
      throw new Error('NerisSchemaService not initialized. Call initialize() first.');
    }
    
    return this.valueSets[setName] || [];
  }

  /**
   * Validate incident type
   */
  validateIncidentType(type) {
    const validTypes = this.getIncidentTypes();
    
    if (!type || !type.value_1 || !type.value_2 || !type.value_3) {
      return { valid: false, error: 'Invalid incident type structure' };
    }

    const found = validTypes.find(t => 
      t.value_1 === type.value_1 && 
      t.value_2 === type.value_2 && 
      t.value_3 === type.value_3 &&
      t.active === 'TRUE'
    );

    return found 
      ? { valid: true } 
      : { valid: false, error: 'Invalid or inactive incident type' };
  }

  /**
   * Get all required fields for a module
   */
  getRequiredFields(moduleType, moduleName) {
    const module = this.getModule(moduleType, moduleName);
    
    if (!module) {
      return [];
    }

    return module
      .filter(field => field.db_required === 'TRUE')
      .map(field => ({
        name: field.name,
        group: field.group,
        type: field.type,
        definition: field.definition,
        example: field.example
      }));
  }

  /**
   * Get dispatch code mapping template
   */
  getDispatchCodeMappingTemplate() {
    return this.mappings['template__dispatch_code_to_incidenty_type'] || [];
  }

  /**
   * Get location mapping guide
   */
  getLocationMapping() {
    return this.mappings['map_location'] || [];
  }

  /**
   * Get entity (fire department) module fields
   */
  getEntityModuleFields() {
    return this.getModule('entity', 'core_mod_entity_fd') || [];
  }

  /**
   * Get dispatch module fields
   */
  getDispatchModuleFields() {
    return this.getModule('dispatch', 'core_mod_dispatch') || [];
  }

  /**
   * Get core incident module fields
   */
  getCoreIncidentFields() {
    return this.getModule('incident', 'core_mod_incident') || [];
  }

  /**
   * Get all modules for a specific incident type
   */
  getModulesForIncidentType(incidentType) {
    const modules = {};
    
    if (incidentType.value_1 === 'FIRE') {
      modules.fire = this.getFireModuleFields();
      modules.tacticTimestamps = this.getModule('shared', 'mod_tactic_timestamps');
    }
    
    if (incidentType.value_1 === 'MEDICAL') {
      modules.medical = this.getMedicalModuleFields();
    }
    
    if (incidentType.value_1 === 'HAZSIT') {
      modules.hazard = this.getHazardModuleFields();
    }
    
    // Common modules
    modules.unitResponse = this.getUnitResponseFields();
    modules.location = this.getCivicLocationFields();
    modules.dispatch = this.getDispatchModuleFields();
    
    return modules;
  }
}

module.exports = new NerisSchemaService();
