import type { VoiceEngine, VoiceEngineCallbacks } from "./types";

// Dynamic import types - actual imports happen at runtime to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SarvamConversationAgent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SarvamBrowserAudioInterface = any;

export class SarvamVoiceEngine implements VoiceEngine {
  private agent: SarvamConversationAgent | null = null;
  private audioInterface: SarvamBrowserAudioInterface | null = null;
  private callbacks: VoiceEngineCallbacks;
  private connected = false;
  private currentAssistantText = "";
  private currentUserText = "";
  private assistantMsgId = 0;
  private userMsgId = 0;
  private speakerMuted = false;

  constructor(callbacks: VoiceEngineCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(options: {
    instructions: string;
    startMuted?: boolean;
  }): Promise<void> {
    // Fetch API key from server
    const configResponse = await fetch("/api/realtime/sarvam-config");
    if (!configResponse.ok) {
      throw new Error("Failed to get Sarvam configuration");
    }
    const { apiKey } = await configResponse.json();

    // Dynamic import to avoid SSR issues with browser-only SDK
    const { ConversationAgent, BrowserAudioInterface, InteractionType } =
      await import("sarvam-conv-ai-sdk/browser");

    const audioInterface = new BrowserAudioInterface();
    this.audioInterface = audioInterface;

    const orgId = process.env.NEXT_PUBLIC_SARVAM_ORG_ID;
    const workspaceId = process.env.NEXT_PUBLIC_SARVAM_WORKSPACE_ID;
    const appId = process.env.NEXT_PUBLIC_SARVAM_APP_ID;
    const version = process.env.NEXT_PUBLIC_SARVAM_VERSION; // Optional: specific version or "latest"

    if (!orgId || !workspaceId || !appId) {
      throw new Error(
        "Missing Sarvam configuration: NEXT_PUBLIC_SARVAM_ORG_ID, NEXT_PUBLIC_SARVAM_WORKSPACE_ID, NEXT_PUBLIC_SARVAM_APP_ID",
      );
    }

    // Build config object per Sarvam SDK documentation
    const config = {
      user_identifier_type: "email" as const,
      user_identifier: "care-admin@care.org",
      org_id: orgId,
      workspace_id: workspaceId,
      app_id: appId,
      interaction_type: InteractionType.CALL,
      input_sample_rate: 16000 as const,
      output_sample_rate: 16000 as const,
      ...(version && { version: parseInt(version, 10) }), // Must be integer
    };

    console.log("Sarvam Agent Config:", {
      org_id: orgId,
      workspace_id: workspaceId,
      app_id: appId,
      interaction_type: "CALL",
      version: version || "latest committed",
    });

    const agent = new ConversationAgent({
      apiKey,
      platform: "browser",
      config,
      audioInterface,
      textCallback: async (msg: { text: string }) => {
        const id = `sarvam-assistant-${this.assistantMsgId}`;
        this.currentAssistantText += msg.text;
        this.callbacks.onAssistantTranscriptDelta(
          id,
          msg.text,
          this.currentAssistantText,
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventCallback: async (event: { type: string; data?: any }) => {
        switch (event.type) {
          case "server.event.user_speech_start":
            this.userMsgId++;
            this.currentUserText = "";
            this.callbacks.onUserSpeechStart();
            break;
          case "server.event.user_speech_end":
            this.callbacks.onUserSpeechEnd();
            break;
          case "server.event.user_interrupt":
            if (this.currentAssistantText) {
              const assistantId = `sarvam-assistant-${this.assistantMsgId}`;
              this.callbacks.onAssistantTranscriptDone(assistantId);
            }
            if (this.audioInterface) {
              this.audioInterface.interrupt?.();
            }
            this.callbacks.onAssistantSpeakingEnd();
            this.currentAssistantText = "";
            break;
          case "server.event.user_transcript":
            this.currentUserText = event.data?.text || "";
            this.callbacks.onUserTranscript(
              `sarvam-user-${this.userMsgId}`,
              this.currentUserText,
            );
            break;
          case "server.event.transcription":
            // Handle new transcription event from Sarvam SDK
            if (event.data?.role === "user") {
              this.currentUserText = event.data?.content || "";
              this.callbacks.onUserTranscript(
                `sarvam-user-${this.userMsgId}`,
                this.currentUserText,
              );
            } else if (event.data?.role === "bot") {
              // For bot transcription, treat it as assistant text delta
              const text = event.data?.content || "";
              this.currentAssistantText += text;
              this.callbacks.onAssistantTranscriptDelta(
                `sarvam-assistant-${this.assistantMsgId}`,
                text,
                this.currentAssistantText,
              );
            }
            break;
          case "server.event.agent_response_start":
            this.assistantMsgId++;
            this.currentAssistantText = "";
            this.callbacks.onAssistantSpeakingStart();
            break;
          case "server.event.agent_response_end": {
            const assistantId = `sarvam-assistant-${this.assistantMsgId}`;
            this.callbacks.onAssistantTranscriptDone(assistantId);
            this.callbacks.onAssistantSpeakingEnd();
            break;
          }
          case "server.action.interaction_end":
            if (this.currentUserText && this.currentAssistantText) {
              this.callbacks.onResponseComplete(
                this.currentUserText,
                this.currentAssistantText,
              );
            }
            break;
        }
      },
      startCallback: async () => {
        this.connected = true;
        this.callbacks.onConnected();
      },
      endCallback: async () => {
        this.connected = false;
        this.callbacks.onDisconnected();
      },
    });

    this.agent = agent;

    await agent.start();

    // Wait for connection with timeout
    const isStarted = await agent.waitForConnect(10);
    if (!isStarted) {
      throw new Error("Failed to connect to Sarvam - connection timeout");
    }

    if (options.startMuted) {
      this.mute(true);
    }
  }

  disconnect(): void {
    if (this.agent) {
      this.agent.stop();
      this.agent = null;
    }
    this.audioInterface = null;
    this.connected = false;
    this.currentAssistantText = "";
    this.currentUserText = "";
    this.callbacks.onDisconnected();
  }

  mute(muted: boolean): void {
    if (this.agent) {
      if (muted) {
        // Pause input when muting
        if (this.agent.pauseInput) {
          this.agent.pauseInput();
        } else if (this.audioInterface?.pauseRecording) {
          this.audioInterface.pauseRecording();
        }
      } else {
        // Resume input when unmuting
        if (this.agent.resumeInput) {
          this.agent.resumeInput();
        } else if (this.audioInterface?.resumeRecording) {
          this.audioInterface.resumeRecording();
        }
      }
    }
  }

  muteSpeaker(muted: boolean): void {
    this.speakerMuted = muted;
    if (this.audioInterface) {
      if (muted) {
        this.audioInterface.pausePlayback?.();
      } else {
        this.audioInterface.resumePlayback?.();
      }
    }
  }

  sendTextMessage(text: string): void {
    if (!this.agent) throw new Error("Agent not connected");
    this.agent.sendText(text);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
