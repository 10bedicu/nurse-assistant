import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { LLMS } from "@/utils/constants";
import type { VoiceEngine, VoiceEngineCallbacks } from "./types";

export class OpenAIVoiceEngine implements VoiceEngine {
  private session: RealtimeSession | null = null;
  private agent: RealtimeAgent | null = null;
  private callbacks: VoiceEngineCallbacks;
  private connected = false;
  private streamingContent: Map<string, string> = new Map();
  private speakerMuted = false;

  constructor(callbacks: VoiceEngineCallbacks) {
    this.callbacks = callbacks;
  }

  async connect(options: {
    instructions: string;
    startMuted?: boolean;
  }): Promise<void> {
    const tokenResponse = await fetch("/api/realtime/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to get token");
    }

    const { token } = await tokenResponse.json();

    const agent = new RealtimeAgent({
      name: "Assistant",
      instructions: options.instructions,
      voice: "shimmer",
    });
    this.agent = agent;

    const session = new RealtimeSession(agent, {
      model: Object.keys(LLMS)
        .find((key) => {
          const config = LLMS[key as keyof typeof LLMS];
          return "realtime" in config && config.realtime;
        })
        ?.split(":")[1],
      transport: "webrtc",
    });
    this.session = session;

    this.setupListeners(session);

    await session.connect({ apiKey: token });

    if (options.startMuted) {
      session.mute(true);
    }

    this.connected = true;
    this.callbacks.onConnected();
  }

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.agent = null;
    this.connected = false;
    this.streamingContent.clear();
    this.callbacks.onDisconnected();
  }

  mute(muted: boolean): void {
    this.session?.mute(muted);
  }

  muteSpeaker(muted: boolean): void {
    this.speakerMuted = muted;
    if (!this.session?.transport) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transport = this.session.transport as any;
    const peerConnection: RTCPeerConnection | undefined =
      transport.connectionState?.peerConnection;

    if (peerConnection) {
      peerConnection.getReceivers().forEach((receiver: RTCRtpReceiver) => {
        if (receiver.track && receiver.track.kind === "audio") {
          receiver.track.enabled = !muted;
        }
      });
    }
  }

  sendTextMessage(text: string): void {
    if (!this.session) throw new Error("Session not connected");

    this.session.sendMessage({
      type: "message",
      role: "user",
      content: [{ type: "input_text", text }],
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  private setupListeners(session: RealtimeSession): void {
    session.transport.on("audio_transcript_delta", (deltaEvent) => {
      this.callbacks.onAssistantSpeakingStart();

      const prev = this.streamingContent.get(deltaEvent.itemId) || "";
      const fullText = prev + deltaEvent.delta;
      this.streamingContent.set(deltaEvent.itemId, fullText);

      this.callbacks.onAssistantTranscriptDelta(
        deltaEvent.itemId,
        deltaEvent.delta,
        fullText,
      );
    });

    session.transport.on("input_audio_buffer.speech_started", () => {
      this.callbacks.onUserSpeechStart();
    });

    session.transport.on("input_audio_buffer.speech_stopped", () => {
      this.callbacks.onUserSpeechEnd();
    });

    session.transport.on(
      "conversation.item.input_audio_transcription.completed",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        this.callbacks.onUserSpeechEnd();
        this.callbacks.onUserTranscript(event.item_id, event.transcript);
      },
    );

    session.on("history_updated", () => {    });

    session.on("agent_end", async (_context, _agent, output) => {
      const history = session.history;
      let userText = "";
      const assistantText = output;

      for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item.type === "message" && item.role === "user") {
          const content = item.content
            .map((c) => {
              if ("text" in c) return c.text;
              if ("transcript" in c && c.transcript) return c.transcript;
              return "";
            })
            .filter(Boolean)
            .join(" ");
          userText = content;
          break;
        }
      }

      if (userText && assistantText) {
        this.callbacks.onResponseComplete(userText, assistantText);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session.transport.on("audio_transcript_done", (event: any) => {
      const itemId =
        event.itemId ||
        event.item_id ||
        Array.from(this.streamingContent.keys()).pop();
      if (itemId) {
        this.streamingContent.delete(itemId);
        this.callbacks.onAssistantTranscriptDone(itemId);
      }
    });

    session.transport.on("output_audio_buffer.stopped", () => {
      this.callbacks.onAssistantSpeakingEnd();
    });

    session.transport.on("response.done", () => {});

    session.transport.on("conversation.interrupted", () => {
      this.callbacks.onAssistantSpeakingEnd();
    });

    session.on("error", (errorEvent) => {
      this.callbacks.onError(
        errorEvent.error instanceof Error
          ? errorEvent.error.message
          : "An error occurred",
      );
    });
  }
}
