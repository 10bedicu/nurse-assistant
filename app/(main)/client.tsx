"use client";

import { useEffect, useRef, useState } from "react";
import { ProjectSerialized } from "@/utils/schemas/project";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  AlertCircle,
  Volume2,
  VolumeX,
  MessageSquare,
  Plus,
} from "lucide-react";
import { Persona } from "@/components/ai-elements/persona";
import { ChatSerialized } from "@/utils/schemas/chat";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { RealtimeAgent } from "@openai/agents/realtime";
import { RealtimeSession } from "@openai/agents/realtime";
import { Badge } from "@/components/ui/badge";
import { ContextSerialized } from "@/utils/schemas/context";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";
import { PATIENT_INFO } from "@/utils/constants";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function Client(props: {
  defaultProject: ProjectSerialized;
  existingChat?: ChatSerialized;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [chat, setChat] = useState<ChatSerialized | null>(
    props.existingChat || null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [contexts, setContexts] = useState<ContextSerialized[]>([]);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const agentRef = useRef<RealtimeAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldCreateChatRef = useRef(false);
  const pendingMessagesRef = useRef<{ user: string; assistant: string }[]>([]);
  const streamingMessageRef = useRef<{
    itemId: string;
    content: string;
  } | null>(null);
  const isSpeakingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load existing chat messages if provided
    if (props.existingChat?.messages) {
      const loadedMessages: Message[] = props.existingChat.messages.map(
        (msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }),
      );
      setMessages(loadedMessages);
    }

    // Fetch all contexts from the database
    const fetchContexts = async () => {
      try {
        const response = await fetch("/api/context");
        if (response.ok) {
          const data = await response.json();
          setContexts(data);
        }
      } catch (err) {
        console.error("Error fetching contexts:", err);
      }
    };
    fetchContexts();

    return () => {
      disconnect();
    };
  }, []);

  const createChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: props.defaultProject.id }),
      });

      if (!response.ok) throw new Error("Failed to create chat");

      const newChat = await response.json();
      setChat(newChat);

      // Update URL silently without navigation
      window.history.pushState({}, "", `/chat/${newChat.id}`);

      // Invalidate chat list to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ["chats"] });

      return newChat;
    } catch (err) {
      console.error("Error creating chat:", err);
      setError("Failed to create chat session");
      throw err;
    }
  };

  const saveMessage = async (role: "user" | "assistant", content: string) => {
    if (!chat) return;

    try {
      const response = await fetch("/api/chats/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: chat.id,
          role,
          content,
          contextIds: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to save message");

      const savedMessage = await response.json();
      return savedMessage;
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const connect = async (startMuted = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Mark that we should create chat after first AI response
      if (!chat) {
        shouldCreateChatRef.current = true;
      }

      // Get ephemeral token
      const tokenResponse = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: props.defaultProject.id }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await tokenResponse.json();

      // Build instructions with project context

      const instructions = `${props.defaultProject.prompt.content}\n\nPatient Information:\n${PATIENT_INFO}\n\nContext:\n${props.defaultProject.contexts
        .map(
          (c, idx) =>
            `==== START CONTEXT ${idx + 1} : ${c.name} ====\n${c.text}\n==== END Context ${idx + 1} ====`,
        )
        .join("\n\n")}`;

      console.log(instructions);

      // Create the agent
      const agent = new RealtimeAgent({
        name: "Assistant",
        instructions: instructions,
      });

      agentRef.current = agent;

      // Create session with WebRTC transport (auto-configured in browser)
      const session = new RealtimeSession(agent, {
        model: "gpt-realtime",
        transport: "webrtc", // SDK will auto-configure microphone and speakers
      });

      sessionRef.current = session;

      // Set up event listeners before connecting
      setupSessionListeners(session);

      // Connect to the session
      await session.connect({ apiKey: token });

      // Mute the microphone if requested
      if (startMuted) {
        session.mute(true);
        setIsMicMuted(true);
      }

      setIsConnected(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Error connecting:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to voice chat",
      );
      setIsLoading(false);
    }
  };

  const setupSessionListeners = (session: RealtimeSession) => {
    // Access the audio element from the WebRTC transport
    // The SDK uses an HTMLAudioElement for playback
    if (session.transport && "audio" in session.transport) {
      audioElementRef.current = (session.transport as any).audio;
      const audioEl = audioElementRef.current;
      if (audioEl) {
        audioEl.onplay = () => {
          isSpeakingRef.current = true;
          setIsSpeaking(true);
        };
        audioEl.onpause = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        };
        audioEl.onended = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        };
      }
    }

    // Listen for streaming transcript deltas from transport layer (for assistant)
    session.transport.on("audio_transcript_delta", (deltaEvent) => {
      console.log("Transcript delta:", deltaEvent);
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
      }

      // Initialize or update streaming message
      if (
        !streamingMessageRef.current ||
        streamingMessageRef.current.itemId !== deltaEvent.itemId
      ) {
        streamingMessageRef.current = {
          itemId: deltaEvent.itemId,
          content: deltaEvent.delta,
        };
      } else {
        streamingMessageRef.current.content += deltaEvent.delta;
      }

      // Update messages with streaming content
      setMessages((prev) => {
        if (!streamingMessageRef.current) return prev;

        const existing = prev.find((m) => m.id === deltaEvent.itemId);
        if (existing) {
          return prev.map((m) =>
            m.id === deltaEvent.itemId
              ? { ...m, content: streamingMessageRef.current!.content }
              : m,
          );
        } else {
          return [
            ...prev,
            {
              id: deltaEvent.itemId,
              role: "assistant",
              content: streamingMessageRef.current!.content,
              timestamp: new Date(),
            },
          ];
        }
      });
    });

    // Listen for when user starts speaking (audio buffer start)
    session.transport.on("input_audio_buffer.speech_started", (event: any) => {
      console.log("User started speaking:", event);
      setIsListening(true);
    });

    // Listen for when user stops speaking (audio buffer end)
    session.transport.on("input_audio_buffer.speech_stopped", (event: any) => {
      console.log("User stopped speaking:", event);
      setIsListening(false);
    });

    // Listen for user audio transcription completion
    session.transport.on(
      "conversation.item.input_audio_transcription.completed",
      (event: any) => {
        console.log("User transcription completed:", event);
        setIsListening(false);

        setMessages((prev) => {
          const existing = prev.find((m) => m.id === event.item_id);
          if (existing) {
            return prev.map((m) =>
              m.id === event.item_id ? { ...m, content: event.transcript } : m,
            );
          } else {
            return [
              ...prev,
              {
                id: event.item_id,
                role: "user",
                content: event.transcript,
                timestamp: new Date(),
              },
            ];
          }
        });
      },
    );

    // Listen for history updates - but don't overwrite streaming messages
    session.on("history_updated", (history) => {
      console.log("History updated:", history);

      // Convert history to messages for UI
      const newMessages: Message[] = [];

      history.forEach((item) => {
        if (item.type === "message") {
          // Extract text from content array
          const content = item.content
            .map((c) => {
              if ("text" in c) return c.text;
              if ("transcript" in c && c.transcript) return c.transcript;
              return "";
            })
            .filter(Boolean)
            .join(" ");

          if (content) {
            newMessages.push({
              id: item.itemId,
              role: item.role as "user" | "assistant",
              content,
              timestamp: new Date(),
            });
          }
        }
      });

      // Only update if we're not actively streaming, or merge with streaming content
      setMessages((prev) => {
        if (streamingMessageRef.current) {
          const streamingMsg = newMessages.find(
            (msg) => msg.id === streamingMessageRef.current?.itemId,
          );

          // If history has more content than we're currently streaming, update the streaming ref
          const updatedMessages = newMessages.map((msg) => {
            if (msg.id === streamingMessageRef.current?.itemId) {
              // If the new content is longer, extend the streaming ref so animation continues
              if (
                msg.content.length > streamingMessageRef.current!.content.length
              ) {
                streamingMessageRef.current!.content = msg.content;
              } else if (msg.content === streamingMessageRef.current!.content) {
                // Content matches exactly - streaming is complete
                streamingMessageRef.current = null;
              }
              return {
                ...msg,
                content: streamingMessageRef.current?.content || msg.content,
              };
            }
            return msg;
          });

          return updatedMessages;
        }
        return newMessages;
      });
    });

    // When agent ends, save the conversation
    session.on("agent_end", async (context, agent, output) => {
      console.log("Agent ended with output:", output);

      // Get the latest history to find user and assistant messages
      const history = session.history;
      let userText = "";
      let assistantText = output;

      // Find the last user message
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
        await handleResponseComplete(userText, assistantText);
      }
    });

    // Listen for when assistant stops speaking
    session.transport.on("audio_transcript_done", (event: any) => {
      console.log("Assistant audio transcript done:", event);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      streamingMessageRef.current = null;
    });

    // Also listen for response.done to ensure speaking state is cleared
    session.transport.on("response.done", (event: any) => {
      console.log("Response done:", event);
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    });

    // Listen for audio interruptions
    session.transport.on("conversation.interrupted", () => {
      console.log("Assistant was interrupted");
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    });

    // Handle errors
    session.on("error", (errorEvent) => {
      console.error("Session error:", errorEvent);
      setError(
        errorEvent.error instanceof Error
          ? errorEvent.error.message
          : "An error occurred",
      );
    });
  };

  const handleResponseComplete = async (
    userText: string,
    assistantText: string,
  ) => {
    // Create chat if needed
    if (shouldCreateChatRef.current && !chat) {
      try {
        const newChat = await createChat();
        shouldCreateChatRef.current = false;

        // Save both messages to the new chat
        if (newChat && userText && assistantText) {
          await saveMessage("user", userText);
          await saveMessage("assistant", assistantText);
        }
      } catch (err) {
        console.error("Error creating chat:", err);
      }
    } else if (chat) {
      // Save messages to existing chat
      if (userText) await saveMessage("user", userText);
      if (assistantText) await saveMessage("assistant", assistantText);
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    agentRef.current = null;
    if (audioElementRef.current) {
      audioElementRef.current.onplay = null;
      audioElementRef.current.onpause = null;
      audioElementRef.current.onended = null;
    }
    audioElementRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);
    setIsMicMuted(false);
    setIsSpeakerMuted(false);
    setError(null);
  };

  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText("");

    try {
      // If not connected, connect first with muted mic
      if (!sessionRef.current) {
        await connect(true);
        // Wait a brief moment for session to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!sessionRef.current) {
        throw new Error("Failed to establish session");
      }

      // Send text message to the session
      sessionRef.current.sendMessage({
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: messageText,
          },
        ],
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const toggleMicMute = () => {
    if (sessionRef.current) {
      const newMutedState = !isMicMuted;
      sessionRef.current.mute(newMutedState);
      setIsMicMuted(newMutedState);
    }
  };

  const toggleSpeakerMute = () => {
    const newMutedState = !isSpeakerMuted;
    setIsSpeakerMuted(newMutedState);

    // Actually mute/unmute the audio element
    if (audioElementRef.current) {
      audioElementRef.current.muted = newMutedState;
    }
  };

  const findReferencedContexts = (content: string): ContextSerialized[] => {
    return contexts.filter((context) => content.includes(context.name));
  };

  console.log(isSpeaking);

  const showChatbox = isConnected && messages.length > 0;

  return (
    <div className="relative h-[calc(100vh-2rem)] w-full overflow-hidden">
      <div className="absolute top-0 left-4 z-40 flex items-center gap-2">
        {/* Menu Toggle Button */}
        <Button
          variant="outline"
          onClick={toggleSidebar}
          className=" gap-2"
          title="Toggle chat history"
        >
          <MessageSquare className="h-5 w-5" />
          <span>Chat History</span>
        </Button>
        {(props.existingChat || !!sessionRef.current) && (
          <Button
            asChild
            variant="outline"
            className="gap-2"
            title="Toggle chat history"
          >
            <Link href={"/"}>
              <Plus className="h-5 w-5" />
              <span>New Chat</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex h-full w-full">
        {/* Main Persona Container */}
        <div className="flex flex-col h-full flex-1 items-center justify-center transition-all duration-300 ease-in-out">
          <h1 className="text-2xl font-bold mt-8">Nurse Assistant</h1>
          {/* Center Persona */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Persona
              className="size-96"
              state={
                isSpeaking ? "speaking" : isListening ? "listening" : "idle"
              }
              variant="opal"
            />
            <p className="text-lg text-muted-foreground h-0 overflow-visible mt-4">
              {(isListening ||
                (isConnected && !isMicMuted && messages.length === 0)) && (
                <span className="animate-pulse">Listening...</span>
              )}
            </p>
          </div>

          {/* Control Buttons and Input */}
          <div className="p-6 flex gap-3 justify-center items-end w-full max-w-2xl">
            {/* Text Input Container */}
            <div className="flex-1 bg-background rounded-2xl border border-sidebar-border">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message or speak..."
                disabled={isLoading}
                className="min-h-15 max-h-50 resize-none border-0 outline-0 p-4 bg-transparent w-full"
                rows={1}
              />
              <div className="flex gap-2 px-4 pb-4 justify-end">
                {!isConnected && (
                  <Button
                    onClick={() => connect(false)}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    disabled={isLoading}
                    title="Connect voice"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Mic className="h-5 w-5 opacity-50" />
                    )}
                  </Button>
                )}
                <Button
                  onClick={sendTextMessage}
                  disabled={isLoading || !inputText.trim()}
                  size="icon"
                  className="h-10 w-10"
                  title="Send message"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mute Buttons - Only show when connected */}
            {isConnected && (
              <div className="flex flex-col gap-2 h-full">
                <Button
                  onClick={toggleMicMute}
                  variant={isMicMuted ? "destructive" : "outline"}
                  size="icon"
                  className="flex-1 w-15 h-15 aspect-square rounded-full"
                  title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMicMuted ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  onClick={toggleSpeakerMute}
                  variant={isSpeakerMuted ? "destructive" : "outline"}
                  size="icon"
                  className="flex-1 w-15 h-15 aspect-square rounded-full"
                  title={isSpeakerMuted ? "Unmute sound" : "Mute sound"}
                >
                  {isSpeakerMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chatbox - Slides in from right */}
        <div
          className={cn(
            "h-full bg-background/80 backdrop-blur-2xl border  border-sidebar-border transition-all duration-300 ease-in-out overflow-hidden rounded-2xl",
            showChatbox ? "w-100" : "w-0",
          )}
        >
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <p className="text-lg mb-2">No messages yet</p>
                    <p className="text-sm">
                      {isConnected
                        ? "Start speaking or type a message below"
                        : "Connect to start a conversation"}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isStreaming =
                      streamingMessageRef.current?.itemId === msg.id;
                    const referencedContexts = findReferencedContexts(
                      msg.content,
                    );
                    return (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          } ${isStreaming ? "animate-pulse" : ""}`}
                        >
                          <p
                            className={`text-sm whitespace-pre-wrap ${isStreaming ? "animate-in fade-in duration-300" : ""}`}
                          >
                            {msg.content}
                          </p>
                          {referencedContexts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {referencedContexts.map((context) => (
                                <Badge
                                  asChild
                                  key={context.id}
                                  variant="outline"
                                >
                                  <Link href={`/context/${context.id}`}>
                                    📄 {context.name}
                                  </Link>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                {isSpeaking && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <p className="text-sm text-muted-foreground">
                        Speaking...
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
