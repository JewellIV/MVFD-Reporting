/**
 * Quick test script for NERIS framework implementation
 * Run this to verify the setup is working correctly
 */

const NerisSchemaService = require('./server/services/neris/NerisSchemaService');
const NerisValidator = require('./server/services/neris/NerisValidator');

async function testNERISSetup() {
  console.log('🧪 Testing NERIS Framework Implementation...\n');

  try {
    // Test 1: Initialize Schema Service
    console.log('1️⃣  Initializing NERIS Schema Service...');
    await NerisSchemaService.initialize();
    console.log('   ✅ Schema service initialized\n');

    // Test 2: Get Incident Types
    console.log('2️⃣  Loading incident types...');
    const incidentTypes = NerisSchemaService.getIncidentTypes();
    console.log(`   ✅ Loaded ${incidentTypes.length} incident types\n`);

    // Test 3: Get Fire Module
    console.log('3️⃣  Loading fire module...');
    const fireModule = NerisSchemaService.getFireModuleFields();
    console.log(`   ✅ Loaded ${fireModule.length} fire module fields\n`);

    // Test 4: Get Value Sets
    console.log('4️⃣  Loading value sets...');
    const unitTypes = NerisSchemaService.getValueSet('type_unit');
    console.log(`   ✅ Loaded ${unitTypes.length} unit types\n`);

    // Test 5: Validate an incident type
    console.log('5️⃣  Validating incident type...');
    const testIncidentType = {
      value_1: 'FIRE',
      value_2: 'STRUCTURE_FIRE',
      value_3: 'STRUCTURAL_INVOLVEMENT_FIRE'
    };
    const validation = NerisSchemaService.validateIncidentType(testIncidentType);
    console.log(`   ✅ Incident type validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
    if (!validation.valid) {
      console.log(`   ❌ Error: ${validation.error}\n`);
    } else {
      console.log('   ✅ Valid incident type\n');
    }

    // Test 6: Initialize Validator
    console.log('6️⃣  Initializing NERIS Validator...');
    const validator = new NerisValidator();
    await validator.initialize();
    console.log('   ✅ Validator initialized\n');

    // Test 7: Test validation with sample data
    console.log('7️⃣  Testing record validation...');
    const testRecord = {
      incident_neris_id: 'FD12029001:1705320000000',
      incident_internal_id: 'TEST-001',
      incident_final_type: [{
        value_1: 'FIRE',
        value_2: 'STRUCTURE_FIRE',
        value_3: 'STRUCTURAL_INVOLVEMENT_FIRE',
        primary: true
      }],
      incident_location: {
        an_number: 123,
        sn_street_name: 'Main',
        sn_post_type: 'Street',
        csop_city: 'Richmond',
        csop_state: 'VA',
        csop_postal_code: '23219',
        csop_country: 'US'
      },
      incident_point: {
        latitude: 37.5407,
        longitude: -77.4360
      },
      unit_response: [{
        unit_id_linked: 'E101',
        time_dispatch: '2024-01-15T10:00:00Z',
        time_enroute_to_scene: '2024-01-15T10:02:00Z',
        time_on_scene: '2024-01-15T10:05:00Z',
        time_unit_clear: '2024-01-15T11:00:00Z'
      }]
    };

    const recordValidation = await validator.validate(testRecord);
    console.log(`   ✅ Validation complete`);
    console.log(`   📊 Quality score: ${recordValidation.score}/100`);
    console.log(`   ❌ Errors: ${recordValidation.errors.length}`);
    console.log(`   ⚠️  Warnings: ${recordValidation.warnings.length}\n`);

    if (recordValidation.errors.length > 0) {
      console.log('   Validation errors:');
      recordValidation.errors.forEach(err => {
        console.log(`     - ${err.field}: ${err.message}`);
      });
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ NERIS Framework Implementation Test Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Summary:');
    console.log(`   • Incident types loaded: ${incidentTypes.length}`);
    console.log(`   • Fire module fields: ${fireModule.length}`);
    console.log(`   • Unit types: ${unitTypes.length}`);
    console.log(`   • Record validation: ${recordValidation.valid ? 'PASSED' : 'NEEDS ATTENTION'}`);
    console.log(`   • Data quality score: ${recordValidation.score}/100\n`);

    console.log('🚀 You can now start testing the API!');
    console.log('   Run: npm run dev');
    console.log('   Then test endpoints from NERIS_TESTING.md\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testNERISSetup();
