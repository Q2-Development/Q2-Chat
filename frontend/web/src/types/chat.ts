export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
}

export const MAX_VISIBLE_TABS = 4; 