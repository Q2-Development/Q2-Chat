export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  webSearchUsed?: boolean;
  file?: {
    type: string;
    url: string;
    name: string;
  };
}
 
export interface PendingFile {
  id: string;
  file: File;
  url: string; 
  type: 'image' | 'pdf';
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
  model: string;
  pendingFiles: PendingFile[];
  webSearchEnabled?: boolean;
}

export const MAX_VISIBLE_TABS = 5;
export const MAX_FILES_PER_MESSAGE = 1;
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15mb

export const ALLOWED_FILE_TYPES = {
  'image/jpeg': 'image' as const,
  'image/jpg': 'image' as const,
  'image/png': 'image' as const,
  'image/gif': 'image' as const,
  'image/webp': 'image' as const,
  'application/pdf': 'pdf' as const,
};