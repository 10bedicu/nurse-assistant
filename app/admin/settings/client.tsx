"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type VoiceProvider = "openai" | "sarvam";

export function VoiceProviderSettings() {
  const [provider, setProvider] = useState<VoiceProvider>("openai");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Fetch current provider
  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch("/api/config/voice-provider");
        const data = await response.json();
        if (data.provider) {
          setProvider(data.provider as VoiceProvider);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching voice provider:", error);
        setLoading(false);
      }
    };

    fetchProvider();
  }, []);

  const handleProviderChange = async (useSarvam: boolean) => {
    const newProvider: VoiceProvider = useSarvam ? "sarvam" : "openai";
    
    setSaving(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/config/voice-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: newProvider }),
      });

      if (!response.ok) {
        throw new Error("Failed to save configuration");
      }

      setProvider(newProvider);
      setStatus("success");
      console.log(`Voice provider changed to ${newProvider.toUpperCase()}`);

      // Reset status after 3 seconds
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving provider:", error);
      setStatus("error");
      // Reset to previous value
      setProvider(provider === "openai" ? "openai" : "sarvam");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Provider</CardTitle>
        <CardDescription>
          Choose which voice provider to use for realtime voice interactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* OpenAI Option */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <Label className="text-base font-semibold cursor-pointer">
                OpenAI Realtime
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use OpenAI's GPT-4 Realtime for voice interactions. Excellent for English, reliable performance.
              </p>
            </div>
            <Switch
              checked={provider === "openai"}
              onCheckedChange={(checked) => {
                if (checked && provider !== "openai") {
                  handleProviderChange(false);
                }
              }}
              disabled={saving}
              className="ml-4"
            />
          </div>

          {/* Sarvam Option */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex-1">
              <Label className="text-base font-semibold cursor-pointer">
                Sarvam AI
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Use Sarvam's multilingual voice AI. Best for Indian languages (Hindi, Tamil, Telugu, etc.).
              </p>
            </div>
            <Switch
              checked={provider === "sarvam"}
              onCheckedChange={(checked) => {
                if (checked && provider !== "sarvam") {
                  handleProviderChange(true);
                }
              }}
              disabled={saving}
              className="ml-4"
            />
          </div>
        </div>

        {/* Status Indicators */}
        {status !== "idle" && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            status === "success" 
              ? "bg-green-50 text-green-900" 
              : "bg-red-50 text-red-900"
          }`}>
            {status === "success" ? (
              <>
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Configuration saved successfully
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Failed to save configuration
                </span>
              </>
            )}
          </div>
        )}

        {/* Current Selection Display */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-blue-900">
            Current Provider: <span className="font-semibold">{provider.toUpperCase()}</span>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            {provider === "openai"
              ? "Using OpenAI Realtime API for voice interactions"
              : "Using Sarvam AI for voice interactions with multilingual support"}
          </p>
        </div>

        {/* Requirements Note */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm font-medium text-amber-900">
            📋 Requirements:
          </p>
          <ul className="text-xs text-amber-700 mt-2 list-disc list-inside space-y-1">
            {provider === "openai" ? (
              <>
                <li>OPENAI_API_KEY must be configured</li>
                <li>NEXT_PUBLIC_VOICE_PROVIDER can be left as default</li>
              </>
            ) : (
              <>
                <li>SARVAM_API_KEY must be configured</li>
                <li>NEXT_PUBLIC_SARVAM_ORG_ID required</li>
                <li>NEXT_PUBLIC_SARVAM_WORKSPACE_ID required</li>
                <li>NEXT_PUBLIC_SARVAM_APP_ID required</li>
              </>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
