export interface PendingFile {
  id: string;
  file: File;
  url: string; 
  type: 'image' | 'pdf' | 'csv';
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  file?: {
    url: string;
    type: string;
    name: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
  model: string;
  pendingFiles: PendingFile[];
}

export const MAX_VISIBLE_TABS = 4;
export const MAX_FILES_PER_MESSAGE = 1;
export const MAX_FILE_SIZE = 15 * 1024 * 1024; 

export const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'image',
  'image/jpg': 'image', 
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
} as const;

export const AVAILABLE_MODELS = [
  { id: "openai/gpt-4", name: "GPT-4" },
  { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "google/gemini-pro", name: "Gemini Pro" },
] as const;