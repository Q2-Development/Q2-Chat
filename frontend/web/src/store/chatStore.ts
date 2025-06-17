import { create } from 'zustand';
import { Chat, Message, PendingFile, MAX_VISIBLE_TABS, MAX_FILES_PER_MESSAGE, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/types/chat';
import { OpenRouterModel, OpenRouterResponse } from '@/types/models';
import toast from 'react-hot-toast';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getFileType(file: File): 'image' | 'pdf' | null {
  const fileType = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES];
  return fileType || null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface ChatState {
  chats: Chat[];
  visibleTabIds: string[];
  sidebarTabIds: string[];
  activeChatId: string;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelsLoaded: boolean;
  modelSearch: string;
  isSendingMessage: boolean;
  abortController: AbortController | null;
  setActiveChatId: (id: string) => void;
  handleInputChange: (text: string) => void;
  handleModelChange: (model: string) => void;
  handleSendMessage: () => void;
  stopGenerating: () => void;
  addNewChat: () => void;
  closeChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  moveFromSidebar: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  addPendingFiles: (files: FileList | File[]) => Promise<{ success: File[], errors: string[] }>;
  removePendingFile: (fileId: string) => void;
  clearPendingFiles: () => void;
  fetchModels: () => Promise<void>;
  setModelSearch: (search: string) => void;
}

const initialChatId = generateUUID();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [{ 
    id: initialChatId, 
    title: "New Chat", 
    messages: [], 
    input: "",
    model: "openai/gpt-4o",
    pendingFiles: []
  }],
  visibleTabIds: [initialChatId],
  sidebarTabIds: [],
  activeChatId: initialChatId,
  models: [],
  modelsLoading: false,
  modelsError: null,
  modelsLoaded: false,
  modelSearch: '',
  isSendingMessage: false,
  abortController: null,

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

  setModelSearch: (search: string) => {
    set({ modelSearch: search });
  },

  fetchModels: async () => {
    const { modelsLoaded, modelsLoading } = get();
    
    if (modelsLoaded || modelsLoading) return;
    
    set({ modelsLoading: true, modelsError: null });
    
    try {
      const response = await fetch('/api/models');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: OpenRouterResponse = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        set({ 
          models: data.data, 
          modelsLoading: false, 
          modelsLoaded: true,
          modelsError: null 
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      
      const errorMessage = 'Failed to load models. Using GPT-4o as default.';
      toast.error(errorMessage);
      
      set({ 
        modelsLoading: false, 
        modelsError: errorMessage,
        modelsLoaded: true
      });
      
      const { activeChatId, chats } = get();
      set({
        chats: chats.map((chat) =>
          chat.id === activeChatId ? { ...chat, model: "openai/gpt-4o" } : chat
        ),
      });
    }
  },

  updateChatTitle: (chatId: string, title: string) => {
    set({
      chats: get().chats.map((chat) =>
        chat.id === chatId ? { ...chat, title } : chat
      ),
    });
  },

  renameChat: async (chatId: string, newTitle: string) => {
    const originalChat = get().chats.find(c => c.id === chatId);
    if (!originalChat || originalChat.title === newTitle) return;

    get().updateChatTitle(chatId, newTitle);

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/chats/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
            throw new Error('Failed to update chat title on the server.');
        }
    } catch (error) {
        console.error('Failed to rename chat:', error);
        toast.error('Could not rename chat. Please try again.');
        get().updateChatTitle(chatId, originalChat.title);
    }
  },

  addPendingFiles: async (files: FileList | File[]): Promise<{ success: File[], errors: string[] }> => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return { success: [], errors: ['No active chat found'] };

    const fileArray = Array.from(files);
    const errors: string[] = [];
    const success: File[] = [];
    const newPendingFiles: PendingFile[] = [...activeChat.pendingFiles];

    for (const file of fileArray) {
      if (newPendingFiles.length >= MAX_FILES_PER_MESSAGE) {
        errors.push(`Maximum ${MAX_FILES_PER_MESSAGE} files allowed per message`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
        continue;
      }

      const fileType = getFileType(file);
      if (!fileType) {
        errors.push(`File "${file.name}" is not a supported type. Supported: images, PDFs`);
        continue;
      }

      const duplicate = newPendingFiles.find(pf => 
        pf.file.name === file.name && pf.file.size === file.size
      );
      if (duplicate) {
        errors.push(`File "${file.name}" is already added`);
        continue;
      }

      const pendingFile: PendingFile = {
        id: generateUUID(),
        file,
        url: URL.createObjectURL(file),
        type: fileType
      };

      newPendingFiles.push(pendingFile);
      success.push(file);
    }

    set({
      chats: chats.map(chat =>
        chat.id === activeChatId 
          ? { ...chat, pendingFiles: newPendingFiles }
          : chat
      )
    });

    return { success, errors };
  },

  removePendingFile: (fileId: string) => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    const fileToRemove = activeChat.pendingFiles.find(pf => pf.id === fileId);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.url);
    }

    set({
      chats: chats.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              pendingFiles: chat.pendingFiles.filter(pf => pf.id !== fileId)
            }
          : chat
      )
    });
  },

  clearPendingFiles: () => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    activeChat.pendingFiles.forEach(pf => {
      URL.revokeObjectURL(pf.url);
    });

    set({
      chats: chats.map(chat =>
        chat.id === activeChatId
          ? { ...chat, pendingFiles: [] }
          : chat
      )
    });
  },

  stopGenerating: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ isSendingMessage: false, abortController: null });
    }
  },

  handleSendMessage: async () => {
    const { activeChatId, chats, isSendingMessage } = get();
    if (isSendingMessage) return;

    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat || (!activeChat.input.trim() && activeChat.pendingFiles.length === 0)) {
        return;
    }

    const controller = new AbortController();
    set({ isSendingMessage: true, abortController: controller });

    const isFirstMessage = activeChat.messages.length === 0;
    const originalInput = activeChat.input;
    const originalPendingFiles = [...activeChat.pendingFiles];

    const userMessage: Message = {
        id: generateUUID(),
        text: originalInput.trim(),
        isUser: true,
        timestamp: new Date(),
    };

    if (originalPendingFiles.length > 0) {
        userMessage.file = {
            url: originalPendingFiles[0].url,
            type: originalPendingFiles[0].file.type,
            name: originalPendingFiles[0].file.name,
        };
    }

    const assistantMessageId = generateUUID();
    set(state => ({
        chats: state.chats.map(chat =>
            chat.id === activeChatId
                ? {
                    ...chat,
                    messages: [
                        ...chat.messages,
                        userMessage,
                        {
                            id: assistantMessageId,
                            text: "",
                            isUser: false,
                            timestamp: new Date(),
                            isStreaming: true,
                        },
                    ],
                    input: '',
                    pendingFiles: [],
                }
                : chat
        ),
    }));

    try {
 
        let response: Response;

        if (originalPendingFiles.length > 0) {
            const pendingFile = originalPendingFiles[0];
            const formData = new FormData();
            formData.append('file', pendingFile.file);
            formData.append('model', activeChat.model);
            formData.append('chatId', activeChat.id);
            formData.append('prompt', originalInput.trim() || `Please analyze this ${pendingFile.type} file.`);
            
            const endpoint = pendingFile.type === 'image' ? '/chat/upload/image' : '/chat/upload/pdf';
            response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}${endpoint}`, {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });
        } else {
            response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userMessage.text,
                    model: activeChat.model,
                    chatId: activeChatId,
                }),
                signal: controller.signal,
            });
        }

        if (!response.ok || !response.body) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulatedResponse += decoder.decode(value, { stream: true });
            set(state => ({
                chats: state.chats.map(chat =>
                    chat.id === activeChatId
                        ? {
                            ...chat,
                            messages: chat.messages.map(m =>
                                m.id === assistantMessageId ? { ...m, text: accumulatedResponse } : m
                            ),
                        }
                        : chat
                ),
            }));
        }

        set(state => ({
            chats: state.chats.map(chat =>
                chat.id === activeChatId
                    ? {
                        ...chat,
                        messages: chat.messages.map(m =>
                            m.id === assistantMessageId ? { ...m, isStreaming: false } : m
                        ),
                    }
                    : chat
            ),
        }));
        
        if (isFirstMessage) {
            get().updateChatTitle(activeChatId, "New Chat");
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Message generation stopped by user.');
            set(state => ({
                chats: state.chats.map(chat =>
                    chat.id === activeChatId
                        ? {
                            ...chat,
                            messages: chat.messages.slice(0, -2),
                            input: originalInput,
                            pendingFiles: originalPendingFiles,
                        }
                        : chat
                ),
            }));
        } else {
            console.error("Error sending message:", error);
            toast.error("An error occurred. Please try again.");
            set(state => ({
                chats: state.chats.map(chat =>
                    chat.id === activeChatId
                        ? { ...chat, input: originalInput, pendingFiles: originalPendingFiles, messages: chat.messages.slice(0, -2) }
                        : chat
                )
            }));
        }
    } finally {
        set({ isSendingMessage: false, abortController: null });
    }
  },

  addNewChat: () => {
    const { chats, visibleTabIds, sidebarTabIds } = get();
    const newChat: Chat = {
      id: generateUUID(),
      title: "New Chat",
      messages: [],
      input: "",
      model: "openai/gpt-4o",
      pendingFiles: []
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

    const chatToClose = chats.find(c => c.id === chatId);
    if (chatToClose) {
      chatToClose.pendingFiles.forEach(pf => {
        URL.revokeObjectURL(pf.url);
      });
    }

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