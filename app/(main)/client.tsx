"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { getEncoding } from "js-tiktoken";
import { ProjectSerialized } from "@/utils/schemas/project";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { ContextSerialized } from "@/utils/schemas/context";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";
import { LLMS, PATIENT_INFO } from "@/utils/constants";
import { createVoiceEngine, type VoiceEngine } from "@/lib/voice";

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
  const [tokenCount, setTokenCount] = useState(0);

  const engineRef = useRef<VoiceEngine | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldCreateChatRef = useRef(false);
  const streamingMessageRef = useRef<{
    itemId: string;
    content: string;
  } | null>(null);
  const isSpeakingRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get the context limit for the realtime model (use 90% of actual limit)
  const contextLimit = useMemo(() => {
    const realtimeModel = Object.entries(LLMS).find(
      ([_, config]) => "realtime" in config && config.realtime,
    );
    const actualLimit =
      realtimeModel && "contextLimit" in realtimeModel[1]
        ? realtimeModel[1].contextLimit
        : 32_000;
    return Math.floor((actualLimit ?? 32_000) * 0.9);
  }, []);

  // Track if conversation limit is reached
  const [isLimitReached, setIsLimitReached] = useState(false);

  // Build instructions string (same as what's sent to the model)
  const instructions = useMemo(() => {
    return `${props.defaultProject.prompt.content}\n\nPatient Data:\n${PATIENT_INFO}\n\nContext:\n${props.defaultProject.contexts
      .map(
        (c, idx) =>
          `==== START CONTEXT ${idx + 1} : ${c.name} ====\n${c.text}\n==== END Context ${idx + 1} ====`,
      )
      .join("\n\n")}`;
  }, [props.defaultProject]);

  // Calculate tokens whenever messages or instructions change
  useEffect(() => {
    const calculateTokens = () => {
      try {
        const enc = getEncoding("cl100k_base");
        const messagesContent = messages
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n");
        // Include instructions + messages in token count
        const fullContent = `${instructions}\n\n${messagesContent}`;
        const tokens = enc.encode(fullContent);
        const newTokenCount = tokens.length;
        setTokenCount(newTokenCount);

        // Check if limit is reached and disconnect if so
        if (newTokenCount >= contextLimit && !isLimitReached) {
          setIsLimitReached(true);
          disconnect();
        }
      } catch (err) {
        console.error("Error calculating tokens:", err);
      }
    };
    calculateTokens();
  }, [messages, instructions, contextLimit, isLimitReached]);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    return Math.min((tokenCount / contextLimit) * 100, 100);
  }, [tokenCount, contextLimit]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleResponseComplete = useCallback(
    async (userText: string, assistantText: string) => {
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
    },
    [chat],
  );

  const connect = async (startMuted = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Mark that we should create chat after first AI response
      if (!chat) {
        shouldCreateChatRef.current = true;
      }

      const engine = await createVoiceEngine(
        {
        onConnected: () => {
          setIsConnected(true);
          setIsLoading(false);
        },
        onDisconnected: () => {
          setIsConnected(false);
          setIsSpeaking(false);
          setIsListening(false);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
        },
        onUserSpeechStart: () => {
          setIsListening(true);
        },
        onUserSpeechEnd: () => {
          setIsListening(false);
        },
        onUserTranscript: (id, text) => {
          setIsListening(false);
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === id);
            if (existing) {
              return prev.map((m) =>
                m.id === id ? { ...m, content: text } : m,
              );
            } else {
              return [
                ...prev,
                {
                  id,
                  role: "user",
                  content: text,
                  timestamp: new Date(),
                },
              ];
            }
          });
        },
        onAssistantTranscriptDelta: (id, delta, fullText) => {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          }

          // Update streaming ref
          if (
            !streamingMessageRef.current ||
            streamingMessageRef.current.itemId !== id
          ) {
            streamingMessageRef.current = { itemId: id, content: fullText };
          } else {
            streamingMessageRef.current.content = fullText;
          }

          // Update messages with streaming content
          setMessages((prev) => {
            const existing = prev.find((m) => m.id === id);
            if (existing) {
              return prev.map((m) =>
                m.id === id ? { ...m, content: fullText } : m,
              );
            } else {
              return [
                ...prev,
                {
                  id,
                  role: "assistant",
                  content: fullText,
                  timestamp: new Date(),
                },
              ];
            }
          });
        },
        onAssistantTranscriptDone: (_id) => {
          streamingMessageRef.current = null;
        },
        onAssistantSpeakingStart: () => {
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          }
        },
        onAssistantSpeakingEnd: () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
        },
        onResponseComplete: (userText, assistantText) => {
          handleResponseComplete(userText, assistantText);
        },
      },
      props.defaultProject.llmModel,
    );

      engineRef.current = engine;

      await engine.connect({ instructions, startMuted });

      if (startMuted) {
        setIsMicMuted(true);
      }
    } catch (err) {
      console.error("Error connecting:", err);
      setError(
        err instanceof Error ? err.message : "Failed to connect to voice chat",
      );
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    if (engineRef.current) {
      engineRef.current.disconnect();
      engineRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);
    setIsMicMuted(false);
    setIsSpeakerMuted(false);
    setError(null);
  };

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

  // Automatically connect when visiting an existing chat
  useEffect(() => {
    if (props.existingChat && !isConnected && !isLoading && !isLimitReached) {
      connect(true); // Start with mic muted
    }
  }, [props.existingChat]);

  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText("");

    try {
      // If not connected, connect first with muted mic
      if (!engineRef.current) {
        await connect(true);
        // Wait a brief moment for session to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!engineRef.current) {
        throw new Error("Failed to establish session");
      }

      engineRef.current.sendTextMessage(messageText);
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
    if (engineRef.current) {
      const newMutedState = !isMicMuted;
      engineRef.current.mute(newMutedState);
      setIsMicMuted(newMutedState);
    }
  };

  const toggleSpeakerMute = () => {
    const newMutedState = !isSpeakerMuted;
    setIsSpeakerMuted(newMutedState);

    if (engineRef.current) {
      engineRef.current.muteSpeaker(newMutedState);
    }
  };

  const findReferencedContexts = (content: string): ContextSerialized[] => {
    return contexts.filter((context) => content.includes(context.name));
  };

  const showChatbox =
    (isConnected || props.existingChat) && messages.length > 0;

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
        {(props.existingChat || !!engineRef.current) && (
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
          <div className="p-6 flex flex-col gap-2 justify-center items-center w-full max-w-2xl">
            <div className="flex gap-3 w-full items-end">
              {/* Text Input Container */}
              <div className="flex-1 bg-background rounded-2xl border border-sidebar-border">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isLimitReached
                      ? "Conversation limit reached"
                      : "Type a message or speak..."
                  }
                  disabled={isLoading || isLimitReached}
                  className="min-h-15 max-h-50 resize-none border-0 outline-0 p-4 bg-transparent w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  rows={1}
                />
                <div className="flex gap-2 px-4 pb-4 justify-end items-center">
                  {/* Token Usage Pie Chart - Only show when there are messages */}
                  {messages.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      title={`${tokenCount.toLocaleString()} / ${contextLimit.toLocaleString()} tokens`}
                    >
                      <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="transparent"
                          className="stroke-muted"
                          strokeWidth="3"
                        />
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="transparent"
                          className={cn(
                            "transition-all duration-300",
                            usagePercentage >= 100
                              ? "stroke-red-500"
                              : usagePercentage > 90
                                ? "stroke-red-500"
                                : usagePercentage > 70
                                  ? "stroke-yellow-500"
                                  : "stroke-primary",
                          )}
                          strokeWidth="3"
                          strokeDasharray={`${(usagePercentage / 100) * 50.27} 50.27`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        className={cn(
                          isLimitReached && "text-red-500 font-medium",
                        )}
                      >
                        {usagePercentage.toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {!isConnected && !isLimitReached && (
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
                    disabled={isLoading || !inputText.trim() || isLimitReached}
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
            {/* Limit Reached Error Message */}
            {isLimitReached && (
              <p className="text-sm text-red-500 text-center">
                Conversation limit reached, please create a new thread to
                continue
              </p>
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
                                  variant={"link"}
                                  className="underline"
                                >
                                  <Link
                                    href={`/files/${context.filePath}`}
                                    target="_blank"
                                  >
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
