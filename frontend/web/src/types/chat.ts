export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
  model: string;
}

export const MAX_VISIBLE_TABS = 4;

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4", name: "GPT-4" },
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "google/gemini-pro", name: "Gemini Pro" },
] as const;