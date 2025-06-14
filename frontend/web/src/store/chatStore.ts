import { create } from 'zustand';
import { Chat, Message, MAX_VISIBLE_TABS } from '@/types/chat';

// Simple UUID generator for frontend use
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ChatState {
  chats: Chat[];
  visibleTabIds: string[];
  sidebarTabIds: string[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  handleInputChange: (text: string) => void;
  handleModelChange: (model: string) => void;
  handleSendMessage: () => void;
  addNewChat: () => void;
  closeChat: (chatId: string) => void;
  moveFromSidebar: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
}

const initialChatId = generateUUID();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [{ 
    id: initialChatId, 
    title: "New Chat", 
    messages: [], 
    input: "",
    model: "openai/gpt-3.5-turbo"
  }],
  visibleTabIds: [initialChatId],
  sidebarTabIds: [],
  activeChatId: initialChatId,

  setActiveChatId: (id: string) => set({ activeChatId: id }),

  handleInputChange: (text: string) => {
    const { activeChatId, chats } = get();
    set({
      chats: chats.map((chat) =>
        chat.id === activeChatId ? { ...chat, input: text } : chat
      ),
    });
  },

  handleModelChange: (model: string) => {
    const { activeChatId, chats } = get();
    set({
      chats: chats.map((chat) =>
        chat.id === activeChatId ? { ...chat, model } : chat
      ),
    });
  },

  updateChatTitle: (chatId: string, title: string) => {
    set({
      chats: get().chats.map((chat) =>
        chat.id === chatId ? { ...chat, title } : chat
      ),
    });
  },

  handleSendMessage: async () => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat?.input.trim()) return;

    // Check if this is the first message in the chat
    const isFirstMessage = activeChat.messages.length === 0;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: activeChat.input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    set({
      chats: chats.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, userMessage], input: "" }
          : chat
      ),
    });

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };

    set({
      chats: get().chats.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, assistantMessage] }
          : chat
      ),
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.text,
          model: activeChat.model,
          chatId: activeChatId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          set({
            chats: get().chats.map((chat) =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, text: accumulatedText }
                        : msg
                    ),
                  }
                : chat
            ),
          });
        }
      }

      set({
        chats: get().chats.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                ),
              }
            : chat
        ),
      });

      // If this was the first message, fetch the generated title from the backend
      if (isFirstMessage) {
        try {
          const titleResponse = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/chat/${activeChatId}/title`);
          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            get().updateChatTitle(activeChatId, titleData.title);
          }
        } catch (error) {
          console.error('Failed to fetch chat title:', error);
        }
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      
      set({
        chats: get().chats.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { 
                        ...msg, 
                        text: "Sorry, I encountered an error while processing your message. Please try again.",
                        isStreaming: false 
                      }
                    : msg
                ),
              }
            : chat
        ),
      });
    }
  },

  addNewChat: () => {
    const { chats, visibleTabIds, sidebarTabIds } = get();
    const newChat: Chat = {
      id: generateUUID(),
      title: "New Chat",
      messages: [],
      input: "",
      model: "openai/gpt-3.5-turbo",
    };

    set({ chats: [...chats, newChat] });

    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const movedToSidebar = visibleTabIds[0];
      set({
        visibleTabIds: [...visibleTabIds.slice(1), newChat.id],
        sidebarTabIds: [movedToSidebar, ...sidebarTabIds],
        activeChatId: newChat.id,
      });
    } else {
      set({
        visibleTabIds: [...visibleTabIds, newChat.id],
        activeChatId: newChat.id,
      });
    }
  },

  closeChat: (chatId: string) => {
    const { chats, visibleTabIds, sidebarTabIds, activeChatId } = get();
    if (chats.length <= 1) return;

    const isVisible = visibleTabIds.includes(chatId);
    const newChats = chats.filter((c) => c.id !== chatId);
    const newVisibleTabIds = visibleTabIds.filter((id) => id !== chatId);
    const newSidebarTabIds = sidebarTabIds.filter((id) => id !== chatId);

    if (isVisible && sidebarTabIds.length > 0) {
      const toPromote = sidebarTabIds[0];
      set({
        chats: newChats,
        visibleTabIds: [...newVisibleTabIds, toPromote],
        sidebarTabIds: sidebarTabIds.slice(1),
        activeChatId: activeChatId === chatId 
          ? (newVisibleTabIds.find((id) => id !== chatId) || newChats[0].id)
          : activeChatId,
      });
    } else {
      set({
        chats: newChats,
        visibleTabIds: newVisibleTabIds,
        sidebarTabIds: newSidebarTabIds,
        activeChatId: activeChatId === chatId 
          ? (newVisibleTabIds.find((id) => id !== chatId) || newChats[0].id)
          : activeChatId,
      });
    }
  },

  moveFromSidebar: (chatId: string) => {
    const { visibleTabIds, sidebarTabIds } = get();
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const toSidebar = visibleTabIds[0];
      set({
        visibleTabIds: [...visibleTabIds.slice(1), chatId],
        sidebarTabIds: [toSidebar, ...sidebarTabIds.filter((id) => id !== chatId)],
        activeChatId: chatId,
      });
    } else {
      set({
        visibleTabIds: [...visibleTabIds, chatId],
        sidebarTabIds: sidebarTabIds.filter((id) => id !== chatId),
        activeChatId: chatId,
      });
    }
  },
}));