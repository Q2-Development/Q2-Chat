import { create } from 'zustand';
import { Chat, Message, PendingFile, MAX_VISIBLE_TABS, MAX_FILES_PER_MESSAGE, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/types/chat';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getFileType(file: File): 'image' | 'pdf' | 'csv' | null {
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
  setActiveChatId: (id: string) => void;
  handleInputChange: (text: string) => void;
  handleModelChange: (model: string) => void;
  handleSendMessage: () => void;
  addNewChat: () => void;
  closeChat: (chatId: string) => void;
  moveFromSidebar: (chatId: string) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  addPendingFiles: (files: FileList | File[]) => Promise<{ success: File[], errors: string[] }>;
  removePendingFile: (fileId: string) => void;
  clearPendingFiles: () => void;
}

const initialChatId = generateUUID();

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [{ 
    id: initialChatId, 
    title: "New Chat", 
    messages: [], 
    input: "",
    model: "openai/gpt-3.5-turbo",
    pendingFiles: []
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
        errors.push(`File "${file.name}" is not a supported type. Supported: images, PDFs, CSVs`);
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

  handleSendMessage: async () => {
    const { activeChatId, chats } = get();
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) return;

    if (!activeChat.input.trim() && activeChat.pendingFiles.length === 0) return;

    const isFirstMessage = activeChat.messages.length === 0;

    if (activeChat.pendingFiles.length > 0) {
      for (const pendingFile of activeChat.pendingFiles) {
        const userMessage: Message = {
          id: Date.now().toString() + Math.random(),
          text: activeChat.input.trim() || `Uploaded ${pendingFile.file.name}`,
          isUser: true,
          timestamp: new Date(),
          file: {
            url: pendingFile.url,
            type: pendingFile.file.type,
            name: pendingFile.file.name
          }
        };

        set({
          chats: get().chats.map((chat) =>
            chat.id === activeChatId
              ? { ...chat, messages: [...chat.messages, userMessage] }
              : chat
          ),
        });

        const assistantMessageId = (Date.now() + Math.random()).toString();
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
          const formData = new FormData();
          formData.append('file', pendingFile.file);
          formData.append('model', activeChat.model);
          formData.append('chatId', activeChat.id);
          formData.append('prompt', activeChat.input.trim() || `Please analyze this ${pendingFile.type} file.`);

          const endpoint = pendingFile.type === 'image' 
            ? '/chat/upload/image' 
            : pendingFile.type === 'pdf'
            ? '/chat/upload/pdf'
            : '/chat/upload/csv';

          const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}${endpoint}`, {
            method: 'POST',
            body: formData,
          });

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

            set({
              chats: get().chats.map((chat) =>
                chat.id === activeChatId
                  ? {
                      ...chat,
                      messages: chat.messages.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, text: accumulatedResponse }
                          : m
                      ),
                    }
                  : chat
              ),
            });
          }

          set({
            chats: get().chats.map((chat) =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, isStreaming: false }
                        : m
                    ),
                  }
                : chat
            ),
          });

        } catch (error) {
          console.error("Error sending file:", error);
          set({
            chats: get().chats.map((chat) =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { 
                            ...msg, 
                            text: "Sorry, I encountered an error while processing your file. Please try again.",
                            isStreaming: false 
                          }
                        : msg
                    ),
                  }
                : chat
            ),
          });
        }
      }

      get().clearPendingFiles();
      set({
        chats: get().chats.map((chat) =>
          chat.id === activeChatId ? { ...chat, input: "" } : chat
        ),
      });

    } else {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: activeChat.input.trim(),
        isUser: true,
        timestamp: new Date(),
      };

      set({
        chats: get().chats.map((chat) =>
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
    }

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
  },

  addNewChat: () => {
    const { chats, visibleTabIds, sidebarTabIds } = get();
    const newChat: Chat = {
      id: generateUUID(),
      title: "New Chat",
      messages: [],
      input: "",
      model: "openai/gpt-3.5-turbo",
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