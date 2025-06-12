import { create } from 'zustand';
import { Chat, Message, MAX_VISIBLE_TABS } from '@/types/chat';

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
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [{ 
    id: "1", 
    title: "New Chat", 
    messages: [], 
    input: "",
    model: "openai/gpt-3.5-turbo"
  }],
  visibleTabIds: ["1"],
  sidebarTabIds: [],
  activeChatId: "1",

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

  handleSendMessage: async () => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat?.input.trim()) return;

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
          model: activeChat.model 
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
      id: Date.now().toString(),
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