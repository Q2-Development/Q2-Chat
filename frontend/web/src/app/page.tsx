"use client";

import { useEffect } from "react";
import { ChatInput } from "@/components/chat-input";
import { ChatTabs } from "@/components/chat-tabs";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { ChatBody } from "@/components/chat-body";
import { UserMenu } from "@/components/user-menu";
import { AuthGuard } from "@/components/auth-guard";
import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { Chat } from "@/types/chat";
import { useToastListener } from '@/hooks/useToastListener';

function ChatInterface() {
  const {
    chats,
    allChats,
    visibleTabIds,
    activeChatId,
    models,
    modelsLoading,
    modelsError,
    modelSearch,
    isSidebarOpen,
    isSendingMessage,
    chatsLoading,
    dragState,
    setActiveChatId,
    handleInputChange,
    handleSendMessage,
    stopGenerating,
    handleModelChange,
    handleWebSearchToggle,
    addNewChat,
    closeChat,
    toggleSidebar,
    renameChat,
    moveFromSidebar,
    addPendingFiles,
    removePendingFile,
    fetchModels,
    setModelSearch,
    fetchAllChats,
    refreshChats,
    fetchChatMessages,
    setDragState,
    handleDragStart,
    handleDragEnd,
  } = useChatStore();

  useEffect(() => {
    fetchAllChats();
  }, [fetchAllChats]);

  const activeChat = chats.find((c: Chat) => c.id === activeChatId)!;

  return (
    <div className="flex h-screen bg-neutral-900 text-white overflow-hidden">
      <SidebarTabs
        isSidebarOpen={isSidebarOpen}
        allChats={allChats}
        visibleTabIds={visibleTabIds}
        chatsLoading={chatsLoading}
        dragState={dragState}
        closeChat={closeChat}
        moveFromSidebar={moveFromSidebar}
        refreshChats={refreshChats}
        setDragState={setDragState}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatTabs
          chats={chats}
          visibleTabIds={visibleTabIds}
          activeChatId={activeChatId}
          isSidebarOpen={isSidebarOpen}
          dragState={dragState}
          toggleSidebar={toggleSidebar}
          setActiveChatId={setActiveChatId}
          closeChat={closeChat}
          addNewChat={addNewChat}
          renameChat={renameChat}
          setDragState={setDragState}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
        />

        {activeChat && (
          <>
            <ChatBody messages={activeChat.messages} />

            <ChatInput
              inputValue={activeChat.input}
              selectedModel={activeChat.model}
              pendingFiles={activeChat.pendingFiles}
              models={models}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              modelSearch={modelSearch}
              isSendingMessage={isSendingMessage}
              webSearchEnabled={activeChat.webSearchEnabled || false}
              onInputChange={(text) => handleInputChange(text)}
              onSend={handleSendMessage}
              onStop={stopGenerating}
              onModelChange={(model) => handleModelChange(model)}
              onAddFiles={addPendingFiles}
              onRemoveFile={removePendingFile}
              onFetchModels={fetchModels}
              onModelSearch={setModelSearch}
              onWebSearchToggle={handleWebSearchToggle}
            />
          </>
        )}
      </div>

      <UserMenu />
    </div>
  );
}

export default function ChatPage() {
  useToastListener();
  const { initializeSession } = useUserStore();

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return (
    <AuthGuard>
      <ChatInterface />
    </AuthGuard>
  );
}