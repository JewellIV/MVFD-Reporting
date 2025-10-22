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

  <title>National NEMSIS v3.5 Validation Rules</title>
  <ns prefix="nemsis" uri="http://www.nemsis.org"/>

  <!-- National NEMSIS v3.5 validation rules -->

  <!-- Rule: Required elements validation -->
  <rule context="//nemsis:EMSDataSet">
    <assert test="nemsis:Response/nemsis:eResponse.01" severity="error">
      Agency Number (eResponse.01) is required
    </assert>
    <assert test="nemsis:Response/nemsis:eResponse.02" severity="error">
      Incident Number (eResponse.02) is required
    </assert>
    <assert test="nemsis:Times/nemsis:eTimes.01" severity="error">
      Dispatch Date/Time (eTimes.01) is required
    </assert>
  </rule>

  <!-- Rule: Patient demographics validation -->
  <rule context="//nemsis:Patient">
    <assert test="nemsis:ePatient.01" severity="error">
      Patient Age (ePatient.01) is required
    </assert>
    <assert test="nemsis:ePatient.02" severity="error">
      Patient Gender (ePatient.02) is required
    </assert>
  </rule>

  <!-- Rule: Age validation -->
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

  <!-- Rule: Time sequence validation -->
  <rule context="//nemsis:Times">
    <assert test="not(nemsis:eTimes.02) or nemsis:eTimes.01 &lt;= nemsis:eTimes.02" severity="error">
      Dispatch time must be before or equal to en route time
    </assert>
    <assert test="not(nemsis:eTimes.03) or not(nemsis:eTimes.02) or nemsis:eTimes.02 &lt;= nemsis:eTimes.03" severity="error">
      En route time must be before or equal to arrival time
    </assert>
    <assert test="not(nemsis:eTimes.04) or not(nemsis:eTimes.03) or nemsis:eTimes.03 &lt;= nemsis:eTimes.04" severity="error">
      Arrival time must be before or equal to clear time
    </assert>
  </rule>

  <!-- Rule: NEMSIS v3.5 disposition elements -->
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

  <!-- Rule: Clinical assessment validation -->
  <rule context="//nemsis:Clinical">
    <assert test="nemsis:eClinical.01" severity="warning">
      Chief complaint is recommended for clinical assessment
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

  <!-- Rule: Data quality validation -->
  <rule context="//nemsis:EMSDataSet">
    <let name="requiredFields" value="count(//nemsis:eResponse.01 | //nemsis:eResponse.02 | //nemsis:eTimes.01 | //nemsis:ePatient.01 | //nemsis:ePatient.02)"/>
    <let name="totalRequired" value="5"/>
    <let name="completeness" value="($requiredFields div $totalRequired) * 100"/>
    
    <assert test="$completeness >= 100" severity="error">
      All required fields must be completed for NEMSIS compliance
    </assert>
  </rule>

  <!-- Rule: Date/time format validation -->
  <rule context="//nemsis:eTimes.01">
    <assert test=". castable as xs:dateTime" severity="error">
      Dispatch time must be a valid date/time format
    </assert>
  </rule>

  <rule context="//nemsis:eTimes.02">
    <assert test="not(.) or . castable as xs:dateTime" severity="error">
      En route time must be a valid date/time format
    </assert>
  </rule>

  <rule context="//nemsis:eTimes.03">
    <assert test="not(.) or . castable as xs:dateTime" severity="error">
      Arrival time must be a valid date/time format
    </assert>
  </rule>

  <rule context="//nemsis:eTimes.04">
    <assert test="not(.) or . castable as xs:dateTime" severity="error">
      Clear time must be a valid date/time format
    </assert>
  </rule>

  <rule context="//nemsis:eTimes.05">
    <assert test="not(.) or . castable as xs:dateTime" severity="error">
      Transport time must be a valid date/time format
    </assert>
  </rule>

  <!-- Rule: Patient date of birth validation -->
  <rule context="//nemsis:ePatient.07">
    <assert test="not(.) or . castable as xs:date" severity="error">
      Patient date of birth must be a valid date format
    </assert>
  </rule>

  <!-- Rule: Numeric field validation -->
  <rule context="//nemsis:ePatient.05">
    <assert test="not(.) or . castable as xs:decimal" severity="error">
      Patient weight must be a valid decimal number
    </assert>
    <assert test="not(.) or (. >= 0 and . <= 1000)" severity="warning">
      Patient weight should be between 0 and 1000 pounds
    </assert>
  </rule>

  <rule context="//nemsis:ePatient.06">
    <assert test="not(.) or . castable as xs:decimal" severity="error">
      Patient height must be a valid decimal number
    </assert>
    <assert test="not(.) or (. >= 0 and . <= 120)" severity="warning">
      Patient height should be between 0 and 120 inches
    </assert>
  </rule>

  <!-- Rule: String length validation -->
  <rule context="//nemsis:eResponse.01">
    <assert test="string-length(.) <= 50" severity="warning">
      Agency number should not exceed 50 characters
    </assert>
  </rule>

  <rule context="//nemsis:eResponse.02">
    <assert test="string-length(.) <= 50" severity="warning">
      Incident number should not exceed 50 characters
    </assert>
  </rule>

  <!-- Rule: Clinical narrative validation -->
  <rule context="//nemsis:eClinical.01">
    <assert test="string-length(.) <= 1000" severity="warning">
      Chief complaint should not exceed 1000 characters
    </assert>
  </rule>

  <!-- Rule: Disposition validation -->
  <rule context="//nemsis:eDisposition.27">
    <assert test="string-length(.) > 0" severity="error">
      Unit disposition cannot be empty
    </assert>
  </rule>

  <rule context="//nemsis:eDisposition.28">
    <assert test="string-length(.) > 0" severity="error">
      Patient evaluation/care cannot be empty
    </assert>
  </rule>

  <rule context="//nemsis:eDisposition.29">
    <assert test="string-length(.) > 0" severity="error">
      Crew disposition cannot be empty
    </assert>
  </rule>

  <rule context="//nemsis:eDisposition.30">
    <assert test="string-length(.) > 0" severity="error">
      Transport disposition cannot be empty
    </assert>
  </rule>

</schema>