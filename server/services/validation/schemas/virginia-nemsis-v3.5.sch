<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron" 
        xmlns:sch="http://purl.oclc.org/dsdl/schematron"
        xmlns:xs="http://www.w3.org/2001/XMLSchema"
        xmlns:fn="http://www.w3.org/2005/xpath-functions"
        xmlns:math="http://www.w3.org/2005/xpath-functions/math"
        xmlns:array="http://www.w3.org/2005/xpath-functions/array"
        xmlns:map="http://www.w3.org/2005/xpath-functions/map"
        xmlns:err="http://www.w3.org/2005/xqt-errors"
        queryBinding="xslt3">

  <title>Virginia NEMSIS v3.5 Validation Rules</title>
  <ns prefix="nemsis" uri="http://www.nemsis.org"/>

  <!-- Virginia-specific validation rules for NEMSIS v3.5 -->

  <!-- Rule: State must be VA -->
  <rule context="//nemsis:eResponse.08">
    <assert test=". = 'VA'" severity="error">
      State must be 'VA' for Virginia submissions
    </assert>
  </rule>

  <!-- Rule: Zip code must be valid Virginia format -->
  <rule context="//nemsis:eResponse.09">
    <assert test="matches(., '^[0-9]{5}(-[0-9]{4})?$')" severity="warning">
      Zip code should be in valid US format (12345 or 12345-6789)
    </assert>
  </rule>

  <!-- Rule: Patient age validation -->
  <rule context="//nemsis:ePatient.01">
    <assert test=". >= 0 and . <= 120" severity="error">
      Patient age must be between 0 and 120 years
    </assert>
  </rule>

  <!-- Rule: Gender validation -->
  <rule context="//nemsis:ePatient.02">
    <assert test=". = 'M' or . = 'F' or . = 'U'" severity="error">
      Patient gender must be M, F, or U
    </assert>
  </rule>

  <!-- Rule: Required disposition elements in v3.5 -->
  <rule context="//nemsis:Disposition">
    <assert test="nemsis:eDisposition.27" severity="error">
      Unit Disposition (eDisposition.27) is required in NEMSIS v3.5
    </assert>
    <assert test="nemsis:eDisposition.28" severity="error">
      Patient Evaluation/Care (eDisposition.28) is required in NEMSIS v3.5
    </assert>
    <assert test="nemsis:eDisposition.29" severity="error">
      Crew Disposition (eDisposition.29) is required in NEMSIS v3.5
    </assert>
    <assert test="nemsis:eDisposition.30" severity="error">
      Transport Disposition (eDisposition.30) is required in NEMSIS v3.5
    </assert>
  </rule>

  <!-- Rule: Virginia-specific vital signs validation -->
  <rule context="//nemsis:VitalSigns">
    <assert test="not(nemsis:eVital.01) or (nemsis:eVital.01 >= 0 and nemsis:eVital.01 <= 300)" severity="warning">
      Systolic blood pressure should be between 0 and 300 mmHg for Virginia reporting
    </assert>
    <assert test="not(nemsis:eVital.02) or (nemsis:eVital.02 >= 0 and nemsis:eVital.02 <= 200)" severity="warning">
      Diastolic blood pressure should be between 0 and 200 mmHg for Virginia reporting
    </assert>
    <assert test="not(nemsis:eVital.03) or (nemsis:eVital.03 >= 0 and nemsis:eVital.03 <= 300)" severity="warning">
      Heart rate should be between 0 and 300 bpm for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia crew requirements -->
  <rule context="//nemsis:Crew">
    <assert test="nemsis:eCrew.01" severity="warning">
      Crew member name is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eCrew.02" severity="warning">
      Crew member role is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eCrew.03" severity="warning">
      Crew member certification is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia vehicle requirements -->
  <rule context="//nemsis:Vehicle">
    <assert test="nemsis:eVehicle.01" severity="warning">
      Vehicle unit ID is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eVehicle.02" severity="warning">
      Vehicle type is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eVehicle.03" severity="warning">
      Vehicle level is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia medication requirements -->
  <rule context="//nemsis:Medication">
    <assert test="nemsis:eMedication.01" severity="warning">
      Medication name is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eMedication.02" severity="warning">
      Medication dose is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eMedication.03" severity="warning">
      Medication route is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia procedure requirements -->
  <rule context="//nemsis:Procedure">
    <assert test="nemsis:eProcedure.01" severity="warning">
      Procedure name is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eProcedure.02" severity="warning">
      Procedure time is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eProcedure.03" severity="warning">
      Procedure success is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia injury requirements -->
  <rule context="//nemsis:Injury">
    <assert test="nemsis:eInjury.01" severity="warning">
      Injury type is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eInjury.02" severity="warning">
      Injury mechanism is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eInjury.03" severity="warning">
      Injury location is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Virginia outcome requirements -->
  <rule context="//nemsis:Outcome">
    <assert test="nemsis:eOutcome.01" severity="warning">
      Patient outcome is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eOutcome.02" severity="warning">
      Treatment outcome is recommended for Virginia reporting
    </assert>
    <assert test="nemsis:eOutcome.03" severity="warning">
      Discharge status is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Dispatch time must be before arrival time -->
  <rule context="//nemsis:eTimes.01 and //nemsis:eTimes.03">
    <assert test="//nemsis:eTimes.01 &lt; //nemsis:eTimes.03" severity="error">
      Dispatch time must be before arrival time
    </assert>
  </rule>

  <!-- Rule: Arrival time must be before clear time -->
  <rule context="//nemsis:eTimes.03 and //nemsis:eTimes.04">
    <assert test="//nemsis:eTimes.03 &lt; //nemsis:eTimes.04" severity="warning">
      Arrival time should be before clear time
    </assert>
  </rule>

  <!-- Rule: Vital signs validation -->
  <rule context="//nemsis:eClinical.01">
    <assert test="string-length(.) &gt; 0" severity="warning">
      Chief complaint should not be empty
    </assert>
  </rule>

  <!-- Rule: Data quality scoring -->
  <rule context="//nemsis:EMSDataSet">
    <let name="requiredFields" value="count(//nemsis:eResponse.01 | //nemsis:eResponse.02 | //nemsis:eTimes.01 | //nemsis:ePatient.01 | //nemsis:ePatient.02)"/>
    <let name="totalRequired" value="5"/>
    <let name="completeness" value="($requiredFields div $totalRequired) * 100"/>
    
    <assert test="$completeness &gt;= 80" severity="warning">
      Data completeness is {$completeness}%. Should be at least 80% for quality reporting.
    </assert>
  </rule>

  <!-- Rule: Virginia-specific data elements -->
  <rule context="//nemsis:eResponse.10">
    <assert test="string-length(.) &gt; 0" severity="warning">
      County information is recommended for Virginia reporting
    </assert>
  </rule>

  <!-- Rule: Incident type validation -->
  <rule context="//nemsis:eResponse.04">
    <assert test="string-length(.) &gt; 0" severity="error">
      Incident type is required
    </assert>
  </rule>

  <!-- Rule: Response mode validation -->
  <rule context="//nemsis:eResponse.05">
    <assert test=". = 'Emergency' or . = 'Non-Emergency' or . = 'Standby'" severity="warning">
      Response mode should be Emergency, Non-Emergency, or Standby
    </assert>
  </rule>

  <!-- Rule: Transport validation -->
  <rule context="//nemsis:Transport">
    <assert test="nemsis:eTransport.01" severity="warning">
      Transport mode is recommended
    </assert>
    <assert test="nemsis:eTransport.02" severity="warning">
      Destination is recommended
    </assert>
  </rule>

  <!-- Rule: Time validation -->
  <rule context="//nemsis:eTimes.01">
    <assert test=". castable as xs:dateTime" severity="error">
      Dispatch time must be a valid date/time
    </assert>
  </rule>

  <rule context="//nemsis:eTimes.03">
    <assert test=". castable as xs:dateTime" severity="error">
      Arrival time must be a valid date/time
    </assert>
  </rule>

  <!-- Rule: Patient demographics validation -->
  <rule context="//nemsis:Patient">
    <assert test="nemsis:ePatient.01 or nemsis:ePatient.07" severity="warning">
      Either patient age or date of birth should be provided
    </assert>
  </rule>

  <!-- Rule: Clinical assessment validation -->
  <rule context="//nemsis:Clinical">
    <assert test="nemsis:eClinical.01" severity="warning">
      Chief complaint is recommended for clinical assessment
    </assert>
  </rule>

  <!-- Rule: Virginia data quality requirements -->
  <rule context="//nemsis:EMSDataSet">
    <let name="hasLocation" value="count(//nemsis:eResponse.06 | //nemsis:eResponse.07 | //nemsis:eResponse.08 | //nemsis:eResponse.09)"/>
    <let name="hasPatient" value="count(//nemsis:ePatient.01 | //nemsis:ePatient.02)"/>
    <let name="hasClinical" value="count(//nemsis:eClinical.01 | //nemsis:eClinical.02)"/>
    <let name="hasDisposition" value="count(//nemsis:eDisposition.27 | //nemsis:eDisposition.28 | //nemsis:eDisposition.29 | //nemsis:eDisposition.30)"/>
    
    <assert test="$hasLocation &gt;= 2" severity="warning">
      At least 2 location fields should be completed for Virginia reporting
    </assert>
    
    <assert test="$hasPatient &gt;= 1" severity="warning">
      At least 1 patient demographic field should be completed
    </assert>
    
    <assert test="$hasClinical &gt;= 1" severity="warning">
      At least 1 clinical field should be completed
    </assert>
    
    <assert test="$hasDisposition &gt;= 2" severity="warning">
      At least 2 disposition fields should be completed for NEMSIS v3.5
    </assert>
  </rule>

</schema>