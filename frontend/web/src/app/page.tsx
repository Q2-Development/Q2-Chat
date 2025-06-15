"use client";

import { ChatInput } from "@/components/chat-input";
import { ChatTabs } from "@/components/chat-tabs";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { ChatBody } from "@/components/chat-body";
import { useChatStore } from "@/store/chatStore";
import { Chat } from "@/types/chat";

export default function ChatPage() {
  const {
    chats,
    visibleTabIds,
    sidebarTabIds,
    activeChatId,
    models,
    modelsLoading,
    modelsError,
    modelSearch,
    setActiveChatId,
    handleInputChange,
    handleSendMessage,
    handleModelChange,
    addNewChat,
    closeChat,
    moveFromSidebar,
    addPendingFiles,
    removePendingFile,
    fetchModels,
    setModelSearch
  } = useChatStore();

  const activeChat = chats.find((c: Chat) => c.id === activeChatId)!;

  return (
    <div className="flex h-screen bg-neutral-900 text-white">
      {sidebarTabIds.length > 0 && (
        <SidebarTabs
          sidebarTabIds={sidebarTabIds}
          chats={chats}
          closeChat={closeChat}
          moveFromSidebar={moveFromSidebar}
        />
      )}

      <div className="flex-1 flex flex-col">
        <ChatTabs
          chats={chats}
          visibleTabIds={visibleTabIds}
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          closeChat={closeChat}
          addNewChat={addNewChat}
        />

        <ChatBody messages={activeChat.messages} />

        <ChatInput
          inputValue={activeChat.input}
          selectedModel={activeChat.model}
          pendingFiles={activeChat.pendingFiles}
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          modelSearch={modelSearch}
          onInputChange={(text) => handleInputChange(text)}
          onSend={handleSendMessage}
          onModelChange={(model) => handleModelChange(model)}
          onAddFiles={addPendingFiles}
          onRemoveFile={removePendingFile}
          onFetchModels={fetchModels}
          onModelSearch={setModelSearch}
        />
      </div>
    </div>
  );
}