const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

/**
 * Dispatch Code Mapping Service
 * 
 * Manages mappings between department dispatch codes and NERIS incident types
 */
class DispatchCodeMappingService {
  constructor() {
    this.mappings = new Map();
    this.mappingFile = path.join(__dirname, 'mappings', 'dispatch_code_mapping.csv');
    this.templateLoaded = false;
  }

  /**
   * Load dispatch code mapping template
   */
  async loadTemplate() {
    try {
      if (!this.templateLoaded) {
        const nerisSchemaService = require('./NerisSchemaService');
        await nerisSchemaService.initialize();
        
        const template = nerisSchemaService.getDispatchCodeMappingTemplate();
        this.templateLoaded = true;
        
        console.log('✅ Dispatch Code Mapping template loaded');
      }
    } catch (error) {
      console.error('❌ Failed to load dispatch code mapping template:', error);
      throw error;
    }
  }

  /**
   * Load department-specific mappings
   */
  async loadMappings(departmentId) {
    try {
      // Check if department-specific mapping file exists
      const deptMappingFile = path.join(__dirname, 'mappings', `dispatch_code_mapping_${departmentId}.csv`);
      
      try {
        const content = await fs.readFile(deptMappingFile, 'utf-8');
        const records = csv.parse(content, { 
          columns: true, 
          skip_empty_lines: true,
          trim: true
        });
        
        this.mappings.set(departmentId, records);
        console.log(`✅ Loaded ${records.length} dispatch code mappings for department ${departmentId}`);
      } catch (error) {
        // File doesn't exist - use empty mappings
        this.mappings.set(departmentId, []);
        console.log(`ℹ️  No custom mappings found for department ${departmentId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load mappings for department ${departmentId}:`, error);
      throw error;
    }
  }

  /**
   * Get incident type for a dispatch code
   */
  async getIncidentTypeForDispatchCode(dispatchCode, departmentId) {
    await this.loadMappings(departmentId);
    
    const deptMappings = this.mappings.get(departmentId) || [];
    
    const mapping = deptMappings.find(m => m.dispatch_code === dispatchCode);
    
    if (mapping) {
      return {
        value_1: mapping.neris_type_value_1,
        value_2: mapping.neris_type_value_2,
        value_3: mapping.neris_type_value_3,
        description_1: mapping.neris_description_1,
        description_2: mapping.neris_description_2,
        description_3: mapping.neris_description_3,
        primary: true
      };
    }
    
    return null;
  }

  /**
   * Add a new dispatch code mapping
   */
  async addMapping(departmentId, dispatchCode, incidentType) {
    await this.loadMappings(departmentId);
    
    const deptMappings = this.mappings.get(departmentId) || [];
    
    // Check if mapping already exists
    const existingIndex = deptMappings.findIndex(m => m.dispatch_code === dispatchCode);
    
    const newMapping = {
      dispatch_code: dispatchCode,
      neris_type_value_1: incidentType.value_1,
      neris_type_value_2: incidentType.value_2,
      neris_type_value_3: incidentType.value_3,
      neris_description_1: incidentType.description_1,
      neris_description_2: incidentType.description_2,
      neris_description_3: incidentType.description_3
    };
    
    if (existingIndex >= 0) {
      deptMappings[existingIndex] = newMapping;
    } else {
      deptMappings.push(newMapping);
    }
    
    this.mappings.set(departmentId, deptMappings);
    
    // Save to file
    await this.saveMappings(departmentId);
  }

  /**
   * Save mappings to file
   */
  async saveMappings(departmentId) {
    const deptMappings = this.mappings.get(departmentId) || [];
    
    if (deptMappings.length === 0) {
      return;
    }
    
    const deptMappingFile = path.join(__dirname, 'mappings', `dispatch_code_mapping_${departmentId}.csv`);
    
    // Convert to CSV format
    const headers = [
      'dispatch_code',
      'neris_type_value_1',
      'neris_type_value_2',
      'neris_type_value_3',
      'neris_description_1',
      'neris_description_2',
      'neris_description_3'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    for (const mapping of deptMappings) {
      const row = headers.map(header => {
        const value = mapping[header] || '';
        // Escape commas and quotes
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(',') + '\n';
    }
    
    await fs.writeFile(deptMappingFile, csvContent, 'utf-8');
  }

  /**
   * Get all dispatch codes for a department
   */
  async getAllDispatchCodes(departmentId) {
    await this.loadMappings(departmentId);
    
    const deptMappings = this.mappings.get(departmentId) || [];
    
    return deptMappings.map(mapping => ({
      dispatch_code: mapping.dispatch_code,
      incident_type: {
        value_1: mapping.neris_type_value_1,
        value_2: mapping.neris_type_value_2,
        value_3: mapping.neris_type_value_3,
        description: `${mapping.neris_description_1} - ${mapping.neris_description_2} - ${mapping.neris_description_3}`
      }
    }));
  }

  /**
   * Delete a dispatch code mapping
   */
  async deleteMapping(departmentId, dispatchCode) {
    await this.loadMappings(departmentId);
    
    const deptMappings = this.mappings.get(departmentId) || [];
    
    const filtered = deptMappings.filter(m => m.dispatch_code !== dispatchCode);
    
    this.mappings.set(departmentId, filtered);
    
    // Save to file
    await this.saveMappings(departmentId);
  }

  /**
   * Get mapping template for download
   */
  getTemplate() {
    return [
      {
        dispatch_code: 'STRF1',
        neris_type_value_1: 'FIRE',
        neris_type_value_2: 'STRUCTURE_FIRE',
        neris_type_value_3: 'STRUCTURAL_INVOLVEMENT_FIRE',
        neris_description_1: 'Fire',
        neris_description_2: 'Structure Fire',
        neris_description_3: 'Structural Involvement'
      },
      {
        dispatch_code: 'MED1',
        neris_type_value_1: 'MEDICAL',
        neris_type_value_2: 'ILLNESS',
        neris_type_value_3: 'BREATHING_PROBLEMS',
        neris_description_1: 'Medical',
        neris_description_2: 'Illness',
        neris_description_3: 'Breathing Problems'
      }
    ];
  }
}

module.exports = new DispatchCodeMappingService();
