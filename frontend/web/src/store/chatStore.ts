import { create } from 'zustand';
import { Chat, Message, PendingFile, MAX_VISIBLE_TABS, MAX_FILES_PER_MESSAGE, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/types/chat';
import { OpenRouterModel, OpenRouterResponse } from '@/types/models';
import toast from 'react-hot-toast';
import { useUserStore } from './userStore';


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

const getInitialModel = () => {
  if (typeof window !== 'undefined') {
    try {
      const savedPreferences = localStorage.getItem('q2-chat-preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        return preferences.defaultModel || "openai/gpt-4o";
      }
    } catch (e) {
      console.error('Error loading preferences for initial model:', e);
    }
  }
  return "openai/gpt-4o";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface BackendChat {
  id: string;
  title: string;
}

interface DragState {
  isDragging: boolean;
  draggedChatId: string | null;
  draggedFrom: 'tab' | 'sidebar' | null;
  dropZone: 'tab' | 'sidebar' | null;
}

interface ChatState {
  chats: Chat[];
  allChats: Chat[];
  visibleTabIds: string[];
  activeChatId: string;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelsLoaded: boolean;
  modelSearch: string;
  isSendingMessage: boolean;
  abortController: AbortController | null;
  isSidebarOpen: boolean;
  chatsLoading: boolean;
  chatsLoaded: boolean;
  dragState: DragState;
  setActiveChatId: (id: string) => void;
  handleInputChange: (text: string) => void;
  handleModelChange: (model: string) => void;
  handleSendMessage: () => void;
  stopGenerating: () => void;
  addNewChat: () => void;
  closeChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => void;
  toggleSidebar: () => void;
  moveFromSidebar: (chatId: string) => void;
  moveToSidebar: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  addPendingFiles: (files: FileList | File[]) => Promise<{ success: File[], errors: string[] }>;
  removePendingFile: (fileId: string) => void;
  clearPendingFiles: () => void;
  fetchModels: () => Promise<void>;
  setModelSearch: (search: string) => void;
  fetchAllChats: () => Promise<void>;
  setDragState: (state: Partial<DragState>) => void;
  clearDragState: () => void;
  handleDragStart: (chatId: string, from: 'tab' | 'sidebar') => void;
  handleDragEnd: () => void;
  handleDrop: (chatId: string, to: 'tab' | 'sidebar') => void;
  createRemoteChat: (chat: Chat) => Promise<Chat | null>;
}

const initialChatId = generateUUID();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [{
    id: initialChatId,
    title: "New Chat",
    messages: [],
    input: "",
    model: getInitialModel(),
    pendingFiles: []
  }],
  allChats: [],
  visibleTabIds: [initialChatId],
  activeChatId: initialChatId,
  isSidebarOpen: false,
  models: [],
  modelsLoading: false,
  modelsError: null,
  modelsLoaded: false,
  modelSearch: '',
  isSendingMessage: false,
  abortController: null,
  chatsLoading: false,
  chatsLoaded: false,
  dragState: {
    isDragging: false,
    draggedChatId: null,
    draggedFrom: null,
    dropZone: null,
  },

  setActiveChatId: (id: string) => set({ activeChatId: id }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),

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

  fetchAllChats: async () => {
    const { chatsLoaded, chatsLoading } = get();
    if (chatsLoaded || chatsLoading) return;
    set({ chatsLoading: true });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/chats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const backendChats: BackendChat[] = await response.json();
      const { chats: currentChats } = get();
      const allChats: Chat[] = [];
      for (const backendChat of backendChats) {
        const existingChat = currentChats.find(c => c.id === backendChat.id);
        if (existingChat) {
          allChats.push({ ...existingChat, title: backendChat.title });
        } else {
          allChats.push({
            id: backendChat.id,
            title: backendChat.title,
            messages: [],
            input: "",
            model: "openai/gpt-4o",
            pendingFiles: []
          });
        }
      }
      currentChats.forEach(chat => {
        if (!backendChats.find(bc => bc.id === chat.id)) {
          allChats.push(chat);
        }
      });
      set({
        allChats,
        chats: allChats,
        chatsLoading: false,
        chatsLoaded: true
      });
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      set({
        chatsLoading: false,
        chatsLoaded: true
      });
    }
  },

  setDragState: (newState) => {
    set(state => ({
      dragState: { ...state.dragState, ...newState }
    }));
  },

  clearDragState: () => {
    set({
      dragState: {
        isDragging: false,
        draggedChatId: null,
        draggedFrom: null,
        dropZone: null,
      }
    });
  },

  handleDragStart: (chatId: string, from: 'tab' | 'sidebar') => {
    get().setDragState({
      isDragging: true,
      draggedChatId: chatId,
      draggedFrom: from
    });
  },

  handleDragEnd: () => {
    const { dragState } = get();
    if (dragState.dropZone && dragState.draggedChatId) {
      get().handleDrop(dragState.draggedChatId, dragState.dropZone);
    }
    get().clearDragState();
  },

  handleDrop: (chatId: string, to: 'tab' | 'sidebar') => {
    if (to === 'tab') {
      get().moveFromSidebar(chatId);
    } else {
      get().moveToSidebar(chatId);
    }
  },

  moveToSidebar: (chatId: string) => {
    const { visibleTabIds, activeChatId } = get();
    const newVisibleTabIds = visibleTabIds.filter(id => id !== chatId);
    let newActiveChatId = activeChatId;
    if (activeChatId === chatId && newVisibleTabIds.length > 0) {
      newActiveChatId = newVisibleTabIds[newVisibleTabIds.length - 1];
    }
    set({
      visibleTabIds: newVisibleTabIds,
      activeChatId: newActiveChatId
    });
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
      allChats: get().allChats.map((chat) =>
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

  createRemoteChat: async (chatToCreate: Chat): Promise<Chat | null> => {
    const firstUserMessage = chatToCreate.messages.find(m => m.isUser);
    if (!firstUserMessage) return null;

    try {
      const response = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: chatToCreate.model,
          message: firstUserMessage.text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create chat on server.');
      }
      
      const newChatFromBackend: Chat = await response.json();
      
      set(state => {
        const otherChats = state.chats.filter(c => c.id !== chatToCreate.id);
        const updatedChat = {
          ...newChatFromBackend,
          messages: [firstUserMessage], // Start with just the user message
        };
        return {
          chats: [...otherChats, updatedChat],
          allChats: [...otherChats, updatedChat],
          activeChatId: newChatFromBackend.id,
          visibleTabIds: state.visibleTabIds.map(id => id === chatToCreate.id ? newChatFromBackend.id : id),
        }
      });
      
      toast.success(`Chat "${newChatFromBackend.title}" created!`);
      return newChatFromBackend;

    } catch (error: any) {
      console.error('Error creating remote chat:', error);
      toast.error(error.message);
      set(state => ({
        chats: state.chats.filter(c => c.id !== chatToCreate.id),
      }));
      return null;
    }
  },

  handleSendMessage: async () => {
    const { activeChatId, chats, isSendingMessage, createRemoteChat } = get();
    // const { isAuthenticated, openRouterApiKey } = useUserStore.getState();

    if (isSendingMessage) return;

    let activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat || (!activeChat.input.trim() && activeChat.pendingFiles.length === 0)) {
        return;
    }

    const controller = new AbortController();
    set({ isSendingMessage: true, abortController: controller });

    const isFirstMessage = activeChat.messages.length === 0;
    const originalInput = activeChat.input.trim();
    const originalPendingFiles = [...activeChat.pendingFiles];

    // This is the message object that will be used for both optimistic updates and the API call
    const userMessage: Message = {
      id: generateUUID(),
      text: originalInput,
      isUser: true,
      timestamp: new Date(),
    };

    // --- Start of New Differentiated Logic ---
    let chatToStream: Chat | null = activeChat;
    set(state => ({
      chats: state.chats.map(c =>
          c.id === activeChatId
              ? {
                  ...c,
                  messages: [...c.messages, userMessage],
                  input: '',
                  pendingFiles: [],
                }
              : c
      ),
    }));

    const assistantMessageId = generateUUID();
    set(state => ({
        chats: state.chats.map(chat =>
            chat.id === chatToStream!.id
                ? {
                    ...chat,
                    messages: [
                        ...chat.messages,
                        { id: assistantMessageId, text: "", isUser: false, timestamp: new Date(), isStreaming: true },
                    ],
                    input: '',
                    pendingFiles: [],
                }
                : chat
        ),
    }));

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage.text,
                model: chatToStream!.model,
                chatId: chatToStream!.id,
                // openRouterApiKey: !isAuthenticated ? openRouterApiKey : undefined,  
            }),
            signal: controller.signal,
        });

        if (!response.ok || !response.body) {
            const error = await response.json();
            throw new Error(error.error || `Server responded with ${response.status}`);
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
                    chat.id === chatToStream!.id
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
                chat.id === chatToStream!.id
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
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Message generation stopped by user.');
        } else {
            console.error("Error sending message:", error);
            toast.error("An error occurred. Please try again.");
        }
        // Revert the assistant's placeholder message on any error
        set(state => ({
            chats: state.chats.map(chat =>
                chat.id === chatToStream!.id
                    ? { ...chat, messages: chat.messages.filter(m => m.id !== assistantMessageId) }
                    : chat
            )
        }));
    } finally {
        set({ isSendingMessage: false, abortController: null });
    }
  },

  addNewChat: () => {
    const { chats, visibleTabIds } = get();
    const userStore = useUserStore.getState();
    // const defaultModel = userStore.preferences.defaultModel || "openai/gpt-4o";
    const defaultModel = "openai/gpt-4o";
    
    const newChat: Chat = {
      id: generateUUID(),
      title: "New Chat",
      messages: [],
      input: "",
      model: defaultModel,
      pendingFiles: []
    };
    
    const allChats = [...chats, newChat];
  
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const newVisible = [...visibleTabIds.slice(1), newChat.id];
      set({
        chats: allChats,
        allChats: allChats,
        visibleTabIds: newVisible,
        activeChatId: newChat.id,
      });
    } else {
      set({
        chats: allChats,
        allChats: allChats,
        visibleTabIds: [...visibleTabIds, newChat.id],
        activeChatId: newChat.id,
      });
    }
  },

  closeChat: (chatId: string) => {
    const { chats, visibleTabIds, activeChatId } = get();
    if (chats.length <= 1) return;

    const chatToClose = chats.find(c => c.id === chatId);
    if (chatToClose) {
      chatToClose.pendingFiles.forEach(pf => {
        URL.revokeObjectURL(pf.url);
      });
    }

    const newChats = chats.filter((c) => c.id !== chatId);
    const newAllChats = get().allChats.filter((c) => c.id !== chatId);
    const newVisibleTabIds = visibleTabIds.filter((id) => id !== chatId);

    const sidebarChats = newAllChats.filter(c => !newVisibleTabIds.includes(c.id));

    if (newVisibleTabIds.length < MAX_VISIBLE_TABS && sidebarChats.length > 0) {
      newVisibleTabIds.push(sidebarChats[0].id);
    }

    let newActiveChatId = activeChatId;
    if (activeChatId === chatId) {
      const currentIndex = visibleTabIds.indexOf(chatId);
      if (newVisibleTabIds.length > 0) {
        newActiveChatId = newVisibleTabIds[Math.max(0, currentIndex - 1)];
      } else {
        newActiveChatId = newChats.length > 0 ? newChats[0].id : '';
      }
    }

    set({
      chats: newChats,
      allChats: newAllChats,
      visibleTabIds: newVisibleTabIds,
      activeChatId: newActiveChatId
    });
  },

  moveFromSidebar: (chatId: string) => {
    const { visibleTabIds, chats, allChats } = get();
    const chatToMove = allChats.find(c => c.id === chatId);
    if (!chatToMove) return;

    if (!chats.find(c => c.id === chatId)) {
      set({
        chats: [...chats, chatToMove]
      });
    }

    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      set({
        visibleTabIds: [...visibleTabIds.slice(1), chatId],
        activeChatId: chatId,
      });
    } else {
      set({
        visibleTabIds: [...visibleTabIds, chatId],
        activeChatId: chatId,
      });
    }
  },
}));