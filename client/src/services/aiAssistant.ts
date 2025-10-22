// AI Assistant Service for Field Operations
export interface AIRecommendation {
  type: 'protocol' | 'medication' | 'procedure' | 'warning' | 'suggestion';
  title: string;
  description: string;
  confidence: number;
  source: string;
  action?: string;
  parameters?: any;
}

export interface ProtocolCheck {
  protocol: string;
  status: 'compliant' | 'warning' | 'violation';
  message: string;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface PatientAssessment {
  chiefComplaint: string;
  vitalSigns: any;
  symptoms: string[];
  assessment: string;
  recommendations: AIRecommendation[];
  protocolChecks: ProtocolCheck[];
}

class AIAssistantService {
  private protocols: Map<string, any> = new Map();
  private medications: Map<string, any> = new Map();
  private procedures: Map<string, any> = new Map();
  private symptoms: Map<string, any> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase() {
    // Initialize protocols
    this.protocols.set('cardiac_arrest', {
      name: 'Cardiac Arrest Protocol',
      steps: [
        'Check for responsiveness',
        'Call for help and activate EMS',
        'Check for breathing and pulse',
        'Begin CPR if no pulse',
        'Apply AED if available',
        'Continue CPR until help arrives'
      ],
      medications: ['Epinephrine', 'Amiodarone', 'Atropine'],
      procedures: ['CPR', 'AED', 'Intubation', 'IV Access'],
      vitalSigns: {
        pulse: { min: 0, max: 0, critical: true },
        bloodPressure: { min: 0, max: 0, critical: true },
        respiratoryRate: { min: 0, max: 0, critical: true }
      }
    });

    this.protocols.set('chest_pain', {
      name: 'Chest Pain Protocol',
      steps: [
        'Assess pain characteristics',
        'Check vital signs',
        'Obtain 12-lead ECG',
        'Administer oxygen if needed',
        'Consider aspirin if appropriate',
        'Monitor for changes'
      ],
      medications: ['Aspirin', 'Nitroglycerin', 'Morphine'],
      procedures: ['ECG', 'IV Access', 'Oxygen Therapy'],
      vitalSigns: {
        pulse: { min: 60, max: 100, critical: false },
        bloodPressure: { min: 90, max: 140, critical: false },
        respiratoryRate: { min: 12, max: 20, critical: false }
      }
    });

    this.protocols.set('stroke', {
      name: 'Stroke Protocol',
      steps: [
        'Assess using FAST criteria',
        'Check vital signs',
        'Obtain stroke scale score',
        'Determine time of onset',
        'Consider stroke center transport',
        'Monitor neurological status'
      ],
      medications: ['tPA', 'Aspirin'],
      procedures: ['Neurological Assessment', 'IV Access', 'Oxygen Therapy'],
      vitalSigns: {
        pulse: { min: 60, max: 100, critical: false },
        bloodPressure: { min: 90, max: 140, critical: false },
        respiratoryRate: { min: 12, max: 20, critical: false }
      }
    });

    // Initialize medications
    this.medications.set('epinephrine', {
      name: 'Epinephrine',
      dosage: '1mg IV/IO every 3-5 minutes',
      indications: ['Cardiac Arrest', 'Anaphylaxis', 'Severe Bradycardia'],
      contraindications: ['None in cardiac arrest'],
      sideEffects: ['Tachycardia', 'Hypertension', 'Arrhythmias'],
      precautions: ['Monitor vital signs', 'Use with caution in elderly']
    });

    this.medications.set('aspirin', {
      name: 'Aspirin',
      dosage: '325mg PO (chewed)',
      indications: ['Chest Pain', 'Suspected MI', 'Stroke'],
      contraindications: ['Active bleeding', 'Allergy to aspirin'],
      sideEffects: ['GI upset', 'Bleeding', 'Allergic reaction'],
      precautions: ['Check for allergies', 'Monitor for bleeding']
    });

    this.medications.set('nitroglycerin', {
      name: 'Nitroglycerin',
      dosage: '0.4mg SL every 5 minutes (max 3 doses)',
      indications: ['Chest Pain', 'Angina', 'Heart Failure'],
      contraindications: ['Hypotension', 'Viagra use', 'Right ventricular MI'],
      sideEffects: ['Headache', 'Hypotension', 'Dizziness'],
      precautions: ['Check blood pressure', 'Monitor for hypotension']
    });

    // Initialize procedures
    this.procedures.set('cpr', {
      name: 'Cardiopulmonary Resuscitation',
      steps: [
        'Position patient on firm surface',
        'Place hands on center of chest',
        'Compress at least 2 inches deep',
        'Rate of 100-120 compressions per minute',
        'Allow full chest recoil',
        'Minimize interruptions'
      ],
      indications: ['Cardiac Arrest', 'No pulse', 'No breathing'],
      contraindications: ['None in cardiac arrest'],
      complications: ['Rib fractures', 'Pneumothorax', 'Liver laceration']
    });

    this.procedures.set('intubation', {
      name: 'Endotracheal Intubation',
      steps: [
        'Pre-oxygenate patient',
        'Position head and neck',
        'Insert laryngoscope',
        'Visualize vocal cords',
        'Insert endotracheal tube',
        'Confirm placement',
        'Secure tube'
      ],
      indications: ['Respiratory failure', 'Airway protection', 'Cardiac arrest'],
      contraindications: ['None in emergency'],
      complications: ['Esophageal intubation', 'Pneumothorax', 'Dental damage']
    });

    // Initialize symptoms
    this.symptoms.set('chest_pain', {
      name: 'Chest Pain',
      description: 'Pain or discomfort in the chest area',
      associatedSymptoms: ['shortness_of_breath', 'nausea', 'sweating', 'arm_pain'],
      possibleCauses: ['MI', 'Angina', 'Aortic Dissection', 'Pneumothorax'],
      urgency: 'high'
    });

    this.symptoms.set('shortness_of_breath', {
      name: 'Shortness of Breath',
      description: 'Difficulty breathing or feeling of air hunger',
      associatedSymptoms: ['chest_pain', 'cough', 'wheezing', 'fatigue'],
      possibleCauses: ['COPD', 'Heart Failure', 'Pneumonia', 'Pulmonary Embolism'],
      urgency: 'high'
    });

    this.symptoms.set('altered_mental_status', {
      name: 'Altered Mental Status',
      description: 'Change in level of consciousness or cognitive function',
      associatedSymptoms: ['confusion', 'agitation', 'lethargy', 'unresponsiveness'],
      possibleCauses: ['Stroke', 'Hypoglycemia', 'Drug Overdose', 'Head Injury'],
      urgency: 'high'
    });
  }

  // Analyze patient assessment and provide recommendations
  analyzePatientAssessment(assessment: Partial<PatientAssessment>): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Analyze chief complaint
    if (assessment.chiefComplaint) {
      const complaint = assessment.chiefComplaint.toLowerCase();
      
      if (complaint.includes('chest pain')) {
        recommendations.push({
          type: 'protocol',
          title: 'Chest Pain Protocol',
          description: 'Patient reports chest pain. Consider cardiac protocol.',
          confidence: 0.9,
          source: 'AI Assistant',
          action: 'startProtocol',
          parameters: { protocol: 'chest_pain' }
        });
      }

      if (complaint.includes('difficulty breathing') || complaint.includes('shortness of breath')) {
        recommendations.push({
          type: 'protocol',
          title: 'Respiratory Distress Protocol',
          description: 'Patient reports breathing difficulty. Assess respiratory status.',
          confidence: 0.85,
          source: 'AI Assistant',
          action: 'startProtocol',
          parameters: { protocol: 'respiratory_distress' }
        });
      }

      if (complaint.includes('unresponsive') || complaint.includes('not breathing')) {
        recommendations.push({
          type: 'protocol',
          title: 'Cardiac Arrest Protocol',
          description: 'Patient appears unresponsive. Begin cardiac arrest protocol.',
          confidence: 0.95,
          source: 'AI Assistant',
          action: 'startProtocol',
          parameters: { protocol: 'cardiac_arrest' }
        });
      }
    }

    // Analyze vital signs
    if (assessment.vitalSigns) {
      const vitals = assessment.vitalSigns;
      
      if (vitals.bloodPressure) {
        const systolic = vitals.bloodPressure.systolic;
        const diastolic = vitals.bloodPressure.diastolic;
        
        if (systolic < 90 || diastolic < 60) {
          recommendations.push({
            type: 'warning',
            title: 'Hypotension Alert',
            description: 'Patient has low blood pressure. Consider fluid resuscitation.',
            confidence: 0.8,
            source: 'AI Assistant',
            action: 'monitorVitals',
            parameters: { vital: 'bloodPressure', threshold: 'low' }
          });
        }
        
        if (systolic > 180 || diastolic > 110) {
          recommendations.push({
            type: 'warning',
            title: 'Hypertension Alert',
            description: 'Patient has high blood pressure. Consider antihypertensive therapy.',
            confidence: 0.8,
            source: 'AI Assistant',
            action: 'monitorVitals',
            parameters: { vital: 'bloodPressure', threshold: 'high' }
          });
        }
      }

      if (vitals.heartRate) {
        const hr = vitals.heartRate;
        
        if (hr < 60) {
          recommendations.push({
            type: 'warning',
            title: 'Bradycardia Alert',
            description: 'Patient has slow heart rate. Consider atropine or pacing.',
            confidence: 0.75,
            source: 'AI Assistant',
            action: 'monitorVitals',
            parameters: { vital: 'heartRate', threshold: 'low' }
          });
        }
        
        if (hr > 100) {
          recommendations.push({
            type: 'warning',
            title: 'Tachycardia Alert',
            description: 'Patient has fast heart rate. Consider antiarrhythmic therapy.',
            confidence: 0.75,
            source: 'AI Assistant',
            action: 'monitorVitals',
            parameters: { vital: 'heartRate', threshold: 'high' }
          });
        }
      }

      if (vitals.oxygenSaturation) {
        const spo2 = vitals.oxygenSaturation;
        
        if (spo2 < 90) {
          recommendations.push({
            type: 'warning',
            title: 'Hypoxemia Alert',
            description: 'Patient has low oxygen saturation. Administer oxygen therapy.',
            confidence: 0.9,
            source: 'AI Assistant',
            action: 'administerOxygen',
            parameters: { target: 94 }
          });
        }
      }
    }

    // Analyze symptoms
    if (assessment.symptoms && assessment.symptoms.length > 0) {
      for (const symptom of assessment.symptoms) {
        const symptomData = this.symptoms.get(symptom.toLowerCase());
        if (symptomData) {
          recommendations.push({
            type: 'suggestion',
            title: `${symptomData.name} Assessment`,
            description: symptomData.description,
            confidence: 0.7,
            source: 'AI Assistant',
            action: 'assessSymptom',
            parameters: { symptom: symptom, urgency: symptomData.urgency }
          });
        }
      }
    }

    return recommendations;
  }

  // Check protocol compliance
  checkProtocolCompliance(protocol: string, actions: string[]): ProtocolCheck[] {
    const protocolData = this.protocols.get(protocol);
    if (!protocolData) {
      return [{
        protocol,
        status: 'violation',
        message: 'Unknown protocol',
        severity: 'high',
        recommendations: ['Verify protocol name']
      }];
    }

    const checks: ProtocolCheck[] = [];
    const requiredSteps = protocolData.steps;
    const completedSteps = actions.filter(action => 
      requiredSteps.some(step => action.toLowerCase().includes(step.toLowerCase()))
    );

    if (completedSteps.length === 0) {
      checks.push({
        protocol,
        status: 'violation',
        message: 'No protocol steps completed',
        severity: 'high',
        recommendations: ['Begin protocol immediately']
      });
    } else if (completedSteps.length < requiredSteps.length) {
      checks.push({
        protocol,
        status: 'warning',
        message: `Only ${completedSteps.length} of ${requiredSteps.length} steps completed`,
        severity: 'medium',
        recommendations: ['Complete remaining protocol steps']
      });
    } else {
      checks.push({
        protocol,
        status: 'compliant',
        message: 'All protocol steps completed',
        severity: 'low',
        recommendations: ['Continue monitoring']
      });
    }

    return checks;
  }

  // Get medication information
  getMedicationInfo(medication: string): any {
    return this.medications.get(medication.toLowerCase());
  }

  // Get procedure information
  getProcedureInfo(procedure: string): any {
    return this.procedures.get(procedure.toLowerCase());
  }

  // Get symptom information
  getSymptomInfo(symptom: string): any {
    return this.symptoms.get(symptom.toLowerCase());
  }

  // Get protocol information
  getProtocolInfo(protocol: string): any {
    return this.protocols.get(protocol.toLowerCase());
  }

  // Get all available protocols
  getAvailableProtocols(): string[] {
    return Array.from(this.protocols.keys());
  }

  // Get all available medications
  getAvailableMedications(): string[] {
    return Array.from(this.medications.keys());
  }

  // Get all available procedures
  getAvailableProcedures(): string[] {
    return Array.from(this.procedures.keys());
  }

  // Get all available symptoms
  getAvailableSymptoms(): string[] {
    return Array.from(this.symptoms.keys());
  }

  // Generate report summary
  generateReportSummary(assessment: PatientAssessment): string {
    let summary = `Patient Assessment Summary:\n\n`;
    
    if (assessment.chiefComplaint) {
      summary += `Chief Complaint: ${assessment.chiefComplaint}\n`;
    }
    
    if (assessment.vitalSigns) {
      summary += `Vital Signs:\n`;
      const vitals = assessment.vitalSigns;
      if (vitals.bloodPressure) {
        summary += `  Blood Pressure: ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg\n`;
      }
      if (vitals.heartRate) {
        summary += `  Heart Rate: ${vitals.heartRate} bpm\n`;
      }
      if (vitals.respiratoryRate) {
        summary += `  Respiratory Rate: ${vitals.respiratoryRate} breaths/min\n`;
      }
      if (vitals.oxygenSaturation) {
        summary += `  Oxygen Saturation: ${vitals.oxygenSaturation}%\n`;
      }
    }
    
    if (assessment.assessment) {
      summary += `\nAssessment: ${assessment.assessment}\n`;
    }
    
    if (assessment.recommendations && assessment.recommendations.length > 0) {
      summary += `\nRecommendations:\n`;
      assessment.recommendations.forEach((rec, index) => {
        summary += `  ${index + 1}. ${rec.title}: ${rec.description}\n`;
      });
    }
    
    return summary;
  }
}

export const aiAssistant = new AIAssistantService();