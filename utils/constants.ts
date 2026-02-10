export const LLMS = {
  "openai:gpt-5-mini-2025-08-07": {
    name: "GPT-5 Mini",
    realtime: false,
    contextLimit: 400_000,
  },
  "openai:gpt-5.2-2025-12-11": {
    name: "GPT-5.2",
    realtime: false,
    contextLimit: 400_000,
  },
  "openai:gpt-realtime-2025-08-28": {
    name: "GPT Realtime",
    realtime: true,
    contextLimit: 32_000,
  },
} as const;

export const PATIENT_INFO = `
  Known case of COPD
  acute onset of breathlessness. worsened over past 2 days.
  coughing past 4 days, and his sputum production has increased.
  No history of ICU admission
  He is on a nebulised dose of steroids which he takes twice a day.
  can perform his daily activities but feels breathless on walking and must stop to take a breath.
  
  General Examination:
  On examination he is moderately built, sitting leaning forward on bed, breathless.
  no pedal edema.
  Respiratory system: bilateral wheezes and crepitations.
  ABG: pH: 7.18, PCO2: 82mmHg, PaO2: 58mmHg, Hco3: 30mEq/L
  
  Vitals
  Temperature: 99 deg F,
  RR: 26/minute, also note - using accessory muscles.
  Spo2: 85% on room air,
  BP: 140/90mmHg,
  heart rate: 100/min
  
  Diagnosis:
  COPD also note - most likely due to pneumonia
  Investigations ordered:
  Chest x ray, sputum culture, complete blood count
  Additional instructions:
  Admitted to the ICU
  Patient is initiated on NIV
  Medications: inhaled bronchodilators: salbutamol hourly 2-3 doses
  Ipratropium bromide: hourly 2-3 doses
`;
