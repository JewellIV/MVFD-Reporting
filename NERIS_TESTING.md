# NERIS Framework Testing Guide

This guide will help you get the NERIS framework implementation up and running for testing.

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (root, server, and client)
npm run install-all
```

### 2. Configure Environment

Copy the server environment example and update the database credentials:

```bash
cd server
cp env.example .env
```

Edit `server/.env` and update at minimum:
- `DB_HOST` - Your MySQL host
- `DB_NAME` - Your MySQL database name
- `DB_USER` - Your MySQL username
- `DB_PASSWORD` - Your MySQL password
- `JWT_SECRET` - Generate a random secret (32+ characters)
- `ENCRYPTION_KEY` - Generate a random key (32 characters)

### 3. Start the Development Server

```bash
# From the root directory
npm run dev
```

This will start both the server (port 5000) and client (port 3000) concurrently.

Or start them separately:

```bash
# Terminal 1 - Server
npm run server

# Terminal 2 - Client
npm run client
```

### 4. Test NERIS Endpoints

Once the server is running, you can test the new NERIS endpoints:

#### Get Incident Types
```bash
curl http://localhost:5000/api/neris/incident-types
```

#### Get Fire Module Schema
```bash
curl http://localhost:5000/api/neris/schema/incident/mod_fire
```

#### Get Value Set
```bash
curl http://localhost:5000/api/neris/value-set/type_incident
```

#### Get Unit Response Schema
```bash
curl http://localhost:5000/api/neris/schema/shared/mod_unit_response
```

### 5. Create a Test NERIS Record

First, you'll need to authenticate and get a JWT token:

```bash
# Login (you'll need a valid user account)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Save the token from the response
TOKEN="your-jwt-token-here"
```

Then create a test NERIS record:

```bash
curl -X POST http://localhost:5000/api/neris \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "incident_internal_id": "TEST-001",
    "incident_final_type": [
      {
        "value_1": "FIRE",
        "value_2": "STRUCTURE_FIRE",
        "value_3": "STRUCTURAL_INVOLVEMENT_FIRE",
        "primary": true
      }
    ],
    "incident_location": {
      "an_number": 123,
      "sn_street_name": "Main",
      "sn_post_type": "Street",
      "csop_city": "Richmond",
      "csop_state": "VA",
      "csop_postal_code": "23219",
      "csop_country": "US"
    },
    "incident_point": {
      "latitude": 37.5407,
      "longitude": -77.4360
    },
    "unit_response": [
      {
        "unit_id_linked": "E101",
        "time_dispatch": "2024-01-15T10:00:00Z",
        "time_enroute_to_scene": "2024-01-15T10:02:00Z",
        "time_on_scene": "2024-01-15T10:05:00Z",
        "time_unit_clear": "2024-01-15T11:00:00Z"
      }
    ],
    "fire": {
      "structure_damage": "MODERATE",
      "structure_arrival_conditions": "SMOKE_SHOWING",
      "fire_investigation_need": "YES"
    }
  }'
```

### 6. Validate a Record

```bash
# Replace RECORD_ID with the ID from the created record
curl -X POST http://localhost:5000/api/neris/RECORD_ID/validate \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Test Dispatch Code Mappings

```bash
# Get dispatch mapping template
curl http://localhost:5000/api/neris/dispatch-mappings/template \
  -H "Authorization: Bearer $TOKEN"

# Get all dispatch mappings
curl http://localhost:5000/api/neris/dispatch-mappings \
  -H "Authorization: Bearer $TOKEN"

# Add a new mapping
curl -X POST http://localhost:5000/api/neris/dispatch-mappings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "dispatch_code": "STRF1",
    "incident_type": {
      "value_1": "FIRE",
      "value_2": "STRUCTURE_FIRE",
      "value_3": "STRUCTURAL_INVOLVEMENT_FIRE"
    }
  }'
```

## Database Setup

The database tables will be automatically created when you start the server. The `NerisRecord` model will sync with your database and create the `neris_records` table with all the new NERIS-compliant fields.

To manually sync the database:

```bash
cd server
node -e "const sequelize = require('./config/database'); sequelize.sync({ force: false }).then(() => { console.log('Database synced'); process.exit(0); });"
```

## Testing with Postman

Import these endpoints into Postman for easier testing:

### Collection: NERIS Framework

1. **Get Incident Types**
   - GET `http://localhost:5000/api/neris/incident-types`
   - Headers: `Authorization: Bearer {{token}}`

2. **Create NERIS Record**
   - POST `http://localhost:5000/api/neris`
   - Headers: `Authorization: Bearer {{token}}`
   - Body: (see JSON example above)

3. **Validate Record**
   - POST `http://localhost:5000/api/neris/:id/validate`
   - Headers: `Authorization: Bearer {{token}}`

4. **Get Schema**
   - GET `http://localhost:5000/api/neris/schema/:moduleType/:moduleName`
   - Headers: `Authorization: Bearer {{token}}`

## Troubleshooting

### Issue: "NerisSchemaService not initialized"
**Solution:** Make sure the server started successfully and the NERIS schemas were copied to `server/services/neris/schemas/`

### Issue: "Module not found" errors
**Solution:** Run `npm run install-all` to ensure all dependencies are installed

### Issue: Database connection errors
**Solution:** Verify your `.env` file has the correct database credentials and that MySQL is running

### Issue: CSV parsing errors
**Solution:** The `csv-parse` package should have been installed. If not, run:
```bash
cd server
npm install csv-parse js-yaml
```

## What's Been Implemented

✅ Complete NERIS framework schema files integrated  
✅ Schema parser service for reading CSV/YML files  
✅ Validator service for NERIS compliance  
✅ Updated data model aligned with NERIS core schema  
✅ Dispatch code mapping service  
✅ API endpoints for schema access and validation  
✅ Support for all incident types (Fire, Medical, Hazard, etc.)  
✅ GIS compliance (point/polygon geometry)  
✅ NENA CLDXF location standard compliance

## Next Steps

1. Create test users for authentication
2. Build frontend forms using the schema data
3. Configure dispatch code mappings for your department
4. Test the complete workflow from creation to submission
5. Integrate with NERIS API for actual submission

## API Endpoints Reference

- `GET /api/neris/incident-types` - Get all incident types
- `GET /api/neris/schema/:moduleType/:moduleName` - Get module schema fields
- `GET /api/neris/value-set/:setName` - Get value set data
- `POST /api/neris` - Create new NERIS record
- `POST /api/neris/:id/validate` - Validate a record
- `GET /api/neris/dispatch-mappings` - Get dispatch code mappings
- `POST /api/neris/dispatch-mappings` - Add dispatch code mapping
- `GET /api/neris/dispatch-mappings/template` - Get mapping template

For more details, see the [NERIS Framework Documentation](https://github.com/ulfsri/neris-framework).





