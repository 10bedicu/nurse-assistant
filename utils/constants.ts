export type LlmTransport = "vercel" | "realtime";

export type LlmConfig = {
  name: string;
  /**
   * Which stack to use for TEXT generation.
   * - "vercel": Vercel AI SDK (provider:model-id)
   * - "realtime": OpenAI Realtime API
   *
   * Note: Audio always uses the Realtime API regardless of model selection.
   */
  textTransport: LlmTransport;
  /** Whether this model supports the realtime voice API */
  realtime?: boolean;
  /** Context window token limit for this model */
  contextLimit?: number;
};

export const LLMS = {
  /**
   * Realtime models (text will be generated via Realtime API).
   * Key format is intentionally NOT provider:model-id, since it is not consumed
   * by the Vercel AI SDK factory.
   */
  "realtime:gpt-realtime": {
    name: "OpenAI Realtime (gpt-realtime)",
    textTransport: "realtime",
    realtime: true,
    contextLimit: 128_000,
  },

  /**
   * Standard text models (generated via Vercel AI SDK using BYOK provider keys).
   * Key format: provider:model-id
   */
  "openai:gpt-5-mini-2025-08-07": {
    name: "GPT-5 Mini",
    textTransport: "vercel",
  },
  "openai:gpt-5.2-2025-12-11": {
    name: "GPT-5.2",
    textTransport: "vercel",
  },
  "openai:gpt-realtime-2025-08-28": {
    name: "GPT Realtime",
    textTransport: "realtime",
    realtime: true,
    contextLimit: 128_000,
  },
} as const satisfies Record<string, LlmConfig>;

export const PATIENT_INFO = `65-year-old man, with a history of COPD coming in with acute onset of breathlessness. He says he has been coughing past 4 days, and his sputum production has increased in quantity. He is feeling breathless and this has worsened over past 2 days. He does not give any history of admissions to a hospital or ICU with this complaint in the past. He is on a nebulised dose of steroids which he takes twice a day. He can perform his daily activities but feels breathless on walking and must stop to take a breath. He was a smoker in the past but quit 2 years ago. He is hypertensive and takes amlodipine once in the morning.

On examination he is moderately built, sitting leaning forward on bed, breathless. Temperature: 99 deg F, no pedal edema.

RR: 26/minute, using accessory muscles. Spo2: 85% on room air, BP: 140/90mmHg, heart rate: 100/min

Respiratory system: bilateral wheezes and crepitations.

ABG: pH: 7.18, PCO2: 82mmHg, PaO2: 58mmHg, Hco3: 30mEq/L

Diagnosis:

Doctor makes diagnosis of acute exacerbation of COPD most likely due to pneumonia

Investigations ordered:

Chest x ray, sputum culture, complete blood count

Admitted to the ICU

Patient is initiated on NIV

Medications: inhaled bronchodilators: salbutamol hourly 2-3 doses

Ipratropium bromide: hourly 2-3 doses`;
