export interface VoiceEngineCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
  onUserSpeechStart: () => void;
  onUserSpeechEnd: () => void;
  onUserTranscript: (id: string, text: string) => void;
  onAssistantTranscriptDelta: (
    id: string,
    delta: string,
    fullText: string,
  ) => void;
  onAssistantTranscriptDone: (id: string) => void;
  onAssistantSpeakingStart: () => void;
  onAssistantSpeakingEnd: () => void;
  onResponseComplete: (userText: string, assistantText: string) => void;
}

export interface VoiceEngine {
  connect(options: {
    instructions: string;
    startMuted?: boolean;
  }): Promise<void>;
  disconnect(): void;
  mute(muted: boolean): void;
  muteSpeaker(muted: boolean): void;
  sendTextMessage(text: string): void;
  isConnected(): boolean;
}
