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
  private micMuted = false;

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
      eventCallback: async (event: { type: string; data?: any; role?: string; content?: string; text?: string }) => {
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
            // Mark current assistant message as done
            if (this.currentAssistantText) {
              const assistantId = `sarvam-assistant-${this.assistantMsgId}`;
              this.callbacks.onAssistantTranscriptDone(assistantId);
            }

            // Interrupt audio playback
            if (this.audioInterface) {
              this.audioInterface.interrupt();
            }

            // Reset state
            this.currentAssistantText = "";
            this.callbacks.onAssistantSpeakingEnd();
            break;
          case "server.event.user_transcript":
            this.currentUserText = event.text ?? event.data?.text ?? "";
            this.callbacks.onUserTranscript(
              `sarvam-user-${this.userMsgId}`,
              this.currentUserText,
            );
            break;
          case "server.event.transcription": {
            // SDK passes "Unknown" events as flat objects — role/content at top level
            const role = event.role ?? event.data?.role;
            const content = event.content ?? event.data?.content ?? "";

            if (role === "user" && this.micMuted) break;
            if (role === "bot" && this.speakerMuted) break;

            if (role === "user") {
              this.currentUserText = content;
              this.callbacks.onUserTranscript(
                `sarvam-user-${this.userMsgId}`,
                this.currentUserText,
              );
            } else if (role === "bot") {
              const id = `sarvam-assistant-${this.assistantMsgId}`;
              this.currentAssistantText += content;
              this.callbacks.onAssistantTranscriptDelta(
                id,
                content,
                this.currentAssistantText,
              );
            }
            break;
          }
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
    this.micMuted = muted;

    if (this.audioInterface) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ai = this.audioInterface as any;
      ai.isRecording = !muted;

      if (muted) {
        // Physically disconnect mic from processing pipeline
        try { ai.sourceNode?.disconnect(); } catch { /* may already be disconnected */ }
        this.audioInterface.interrupt?.();
      } else {
        // Reconnect mic to processing pipeline
        try { ai.sourceNode?.connect(ai.inputWorklet); } catch { /* worklet may not exist yet */ }
      }
    }
  }

  muteSpeaker(muted: boolean): void {
    this.speakerMuted = muted;

    if (this.audioInterface) {
      if (muted) {
        // Store original output method, replace with no-op to prevent audio buffering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ai = this.audioInterface as any;
        if (!ai._originalOutput) {
          ai._originalOutput = this.audioInterface.output.bind(this.audioInterface);
        }
        this.audioInterface.output = async () => {};

        // Clear any currently playing audio
        this.audioInterface.interrupt?.();
      } else {
        // Restore original output method
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ai = this.audioInterface as any;
        if (ai._originalOutput) {
          this.audioInterface.output = ai._originalOutput;
          delete ai._originalOutput;
        }
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
