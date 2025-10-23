// Voice Transcription Service for Field Operations
export interface TranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
  duration: number;
}

export interface VoiceCommand {
  command: string;
  action: string;
  parameters: any;
}

class VoiceTranscriptionService {
  private recognition: any;
  private isListening: boolean = false;
  private commands: Map<string, VoiceCommand> = new Map();
  private onResultCallback?: (result: TranscriptionResult) => void;
  private onCommandCallback?: (command: VoiceCommand) => void;

  constructor() {
    this.initializeRecognition();
    this.setupVoiceCommands();
  }

  private initializeRecognition() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if (typeof window !== 'undefined' && 'SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    } else {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Voice recognition started');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Voice recognition ended');
    };

    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const result = results[results.length - 1];
      
      if (result.isFinal) {
        const transcriptionResult: TranscriptionResult = {
          text: result[0].transcript,
          confidence: result[0].confidence,
          timestamp: Date.now(),
          duration: event.timeStamp
        };

        this.onResultCallback?.(transcriptionResult);
        this.processVoiceCommand(transcriptionResult.text);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };
  }

  private setupVoiceCommands() {
    // NEMSIS voice commands
    this.commands.set('patient age', {
      command: 'patient age',
      action: 'setPatientAge',
      parameters: {}
    });

    this.commands.set('patient gender', {
      command: 'patient gender',
      action: 'setPatientGender',
      parameters: {}
    });

    this.commands.set('chief complaint', {
      command: 'chief complaint',
      action: 'setChiefComplaint',
      parameters: {}
    });

    this.commands.set('vital signs', {
      command: 'vital signs',
      action: 'setVitalSigns',
      parameters: {}
    });

    this.commands.set('medication', {
      command: 'medication',
      action: 'addMedication',
      parameters: {}
    });

    this.commands.set('procedure', {
      command: 'procedure',
      action: 'addProcedure',
      parameters: {}
    });

    // NFIRS voice commands
    this.commands.set('fire spread', {
      command: 'fire spread',
      action: 'setFireSpread',
      parameters: {}
    });

    this.commands.set('flame height', {
      command: 'flame height',
      action: 'setFlameHeight',
      parameters: {}
    });

    this.commands.set('smoke color', {
      command: 'smoke color',
      action: 'setSmokeColor',
      parameters: {}
    });

    this.commands.set('wind direction', {
      command: 'wind direction',
      action: 'setWindDirection',
      parameters: {}
    });

    // General commands
    this.commands.set('save record', {
      command: 'save record',
      action: 'saveRecord',
      parameters: {}
    });

    this.commands.set('submit record', {
      command: 'submit record',
      action: 'submitRecord',
      parameters: {}
    });

    this.commands.set('go offline', {
      command: 'go offline',
      action: 'goOffline',
      parameters: {}
    });

    this.commands.set('sync data', {
      command: 'sync data',
      action: 'syncData',
      parameters: {}
    });
  }

  private processVoiceCommand(text: string) {
    const normalizedText = text.toLowerCase().trim();
    
    for (const [command, voiceCommand] of this.commands) {
      if (normalizedText.includes(command)) {
        this.onCommandCallback?.(voiceCommand);
        break;
      }
    }
  }

  // Start voice recognition
  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        resolve();
        return;
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop voice recognition
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Check if currently listening
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Set callback for transcription results
  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  // Set callback for voice commands
  onCommand(callback: (command: VoiceCommand) => void): void {
    this.onCommandCallback = callback;
  }

  // Add custom voice command
  addVoiceCommand(command: string, action: string, parameters: any = {}): void {
    this.commands.set(command.toLowerCase(), {
      command: command.toLowerCase(),
      action,
      parameters
    });
  }

  // Remove voice command
  removeVoiceCommand(command: string): void {
    this.commands.delete(command.toLowerCase());
  }

  // Get available commands
  getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }

  // Check if speech recognition is supported
  isSupported(): boolean {
    return this.recognition !== null;
  }

  // Get browser compatibility info
  getBrowserInfo(): { supported: boolean; browser: string; version: string } {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browser = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }

    return {
      supported: this.isSupported(),
      browser,
      version
    };
  }
}

export const voiceTranscription = new VoiceTranscriptionService();