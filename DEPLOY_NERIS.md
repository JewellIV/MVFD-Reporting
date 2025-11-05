# NERIS Framework Production Deployment Guide
## Live Site: reporting.mangohickfire.com

This guide covers deploying the NERIS framework implementation to production.

## Pre-Deployment Checklist

✅ NERIS framework schemas copied to `server/services/neris/schemas/`  
✅ Schema parser service implemented  
✅ Validator service working  
✅ Database model updated  
✅ API endpoints configured  
✅ Dependencies installed  

## Production Configuration

### 1. Environment Variables

The production database is already configured in `server/production.env`:

```env
DB_HOST=sdb-86.hosting.stackcp.net
DB_PORT=3306
DB_NAME=Reporting-35313030ad32
DB_USER=Reporting-35313030ad32
DB_PASSWORD=T43$cK6Q!Mr$
```

Copy this to `.env` on your production server:
```bash
cp server/production.env server/.env
```

### 2. Install Missing Dependencies

Run these commands on your production server:

```bash
cd server
npm install xmldom csv-parse js-yaml
npm install
```

### 3. Database Migration

The `NerisRecord` model will automatically sync when the server starts. The new fields include:

- `incident_neris_id` - Unique NERIS identifier
- `incident_internal_id` - Department internal ID
- `incident_final_type` - JSON array of incident types
- `incident_location` - NENA CLDXF location data
- `incident_point` - GEOMETRY field for lat/lng
- `incident_polygon` - GEOMETRY field for incident footprint
- `fire`, `medical`, `hazard`, `emerging_hazard`, `exposure`, `rescue_ff`, `rescue_nonff` - Module data
- `unit_response` - Array of unit response data
- `parcel`, `weather` - Augmented data
- `submission_status` - Status tracking
- `submitted_to_neris` - Boolean flag
- `neris_submission_date` - Submission timestamp
- `neris_submission_id` - NERIS API ID

**To create/update the table manually:**

```bash
cd server
node -e "const sequelize = require('./config/database'); sequelize.sync({ alter: true }).then(() => { console.log('Database synced'); process.exit(0); });"
```

Or simply restart the server - it will auto-sync on startup.

## Deployment Steps

### Step 1: Install Dependencies

```bash
# On production server
cd /path/to/MVFD-Reporting/server
npm install
npm install xmldom csv-parse js-yaml
```

### Step 2: Configure Environment

```bash
# Copy production environment
cp production.env .env

# Or create .env with these settings:
# (The database credentials are in production.env)
```

### Step 3: Database Setup

The database will automatically sync on server restart. To force sync:

```bash
node -e "const sequelize = require('./config/database'); sequelize.sync({ alter: true }).then(() => process.exit(0));"
```

### Step 4: Start Server

```bash
# With PM2 (recommended)
pm2 start server/index.js --name mangohick-reporting

# Or with node
node server/index.js

# Or with nodemon (development)
npm run dev
```

### Step 5: Verify NERIS Endpoints

Test the endpoints are working:

```bash
# Get incident types
curl https://reporting.mangohickfire.com/api/neris/incident-types

# Get schema
curl https://reporting.mangohickfire.com/api/neris/schema/incident/mod_fire

# Health check
curl https://reporting.mangohickfire.com/api/health
```

## New API Endpoints

All endpoints require authentication except health check:

### Schema Endpoints
- `GET /api/neris/incident-types` - Get all 128 incident types
- `GET /api/neris/schema/:moduleType/:moduleName` - Get module field definitions
- `GET /api/neris/value-set/:setName` - Get value set data

### Record Endpoints
- `POST /api/neris` - Create new NERIS record (validates automatically)
- `GET /api/neris` - List records
- `GET /api/neris/:id` - Get single record
- `PUT /api/neris/:id` - Update record
- `POST /api/neris/:id/validate` - Validate record quality

### Dispatch Mapping Endpoints
- `GET /api/neris/dispatch-mappings` - Get all dispatch code mappings
- `POST /api/neris/dispatch-mappings` - Add new mapping
- `DELETE /api/neris/dispatch-mappings/:code` - Delete mapping
- `GET /api/neris/dispatch-mappings/template` - Get mapping template

## Testing in Production

### 1. Create a Test User (if needed)

```bash
# Connect to MySQL
mysql -h sdb-86.hosting.stackcp.net -u Reporting-35313030ad32 -p Reporting-35313030ad32

# Check if users table exists
SHOW TABLES;
SELECT * FROM users LIMIT 1;
```

### 2. Create a Test NERIS Record

Use Postman or curl with authentication:

```bash
# Login first to get JWT token
TOKEN=$(curl -X POST https://reporting.mangohickfire.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Create record
curl -X POST https://reporting.mangohickfire.com/api/neris \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-record.json
```

### 3. Verify Validation

```bash
# Validate the record
curl -X POST https://reporting.mangohickfire.com/api/neris/RECORD_ID/validate \
  -H "Authorization: Bearer $TOKEN"
```

## Database Backup

Before deploying, backup your existing database:

```bash
mysqldump -h sdb-86.hosting.stackcp.net \
  -u Reporting-35313030ad32 \
  -p Reporting-35313030ad32 > backup_before_neris_$(date +%Y%m%d).sql
```

## Rollback Plan

If something goes wrong:

```bash
# Stop the server
pm2 stop mangohick-reporting

# Restore database backup
mysql -h sdb-86.hosting.stackcp.net \
  -u Reporting-35313030ad32 \
  -p Reporting-35313030ad32 < backup_before_neris_YYYYMMDD.sql

# Start old version
pm2 start mangohick-reporting
```

## Files Modified for NERIS

- `server/models/NerisRecord.js` - Updated data model
- `server/routes/neris.js` - Added new endpoints
- `server/services/neris/NerisSchemaService.js` - New schema parser
- `server/services/neris/NerisValidator.js` - New validator
- `server/services/neris/DispatchCodeMappingService.js` - New mapping service
- `server/services/neris/schemas/` - Complete NERIS schema files
- `package.json` - Added test script

## Production URLs

- **API Base**: https://reporting.mangohickfire.com/api
- **Health Check**: https://reporting.mangohickfire.com/api/health
- **NERIS Endpoints**: https://reporting.mangohickfire.com/api/neris/*

## Support

For NERIS framework documentation, visit:
- https://github.com/ulfsri/neris-framework
- https://api.neris.fsri.org/v1/docs

## Troubleshooting

### Issue: "Cannot find module 'xmldom'"
```bash
cd server
npm install xmldom
```

### Issue: "Database connection failed"
- Check database credentials in `.env`
- Verify database host is accessible
- Check firewall settings

### Issue: "Table doesn't exist"
```bash
cd server
node -e "require('./config/database').sync({ alter: true }).then(() => process.exit(0))"
```

### Issue: "NerisSchemaService not initialized"
- Check that `server/services/neris/schemas/` directory exists
- Verify schema files are copied correctly
- Check file permissions

## Verification Commands

```bash
# Check if NERIS schemas exist
ls -la server/services/neris/schemas/core_schemas/

# Check database tables
mysql -h sdb-86.hosting.stackcp.net -u Reporting-35313030ad32 -p -e "SHOW TABLES FROM Reporting-35313030ad32"

# Check NerisRecord table structure
mysql -h sdb-86.hosting.stackcp.net -u Reporting-35313030ad32 -p -e "DESCRIBE Reporting-35313030ad32.neris_records"
```





