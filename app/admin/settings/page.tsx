import { VoiceProviderSettings } from "./client";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure voice provider and other system settings
        </p>
      </div>
      <VoiceProviderSettings />
    </div>
  );
}
