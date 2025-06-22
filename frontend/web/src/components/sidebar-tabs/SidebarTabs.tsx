import { Chat } from "@/types/chat";
import { IoClose, IoRefresh } from "react-icons/io5";
import { Loader2 } from "lucide-react";
import styles from "./SidebarTabs.module.css";

interface SidebarTabsProps {
  isSidebarOpen: boolean;
  allChats: Chat[];
  visibleTabIds: string[];
  chatsLoading: boolean;
  dragState: {
    isDragging: boolean;
    draggedChatId: string | null;
    draggedFrom: 'tab' | 'sidebar' | null;
    dropZone: 'tab' | 'sidebar' | null;
  };
  closeChat: (id: string) => void;
  moveFromSidebar: (id: string) => void;
  refreshChats: () => Promise<void>;
  setDragState: (state: any) => void;
  handleDragStart: (chatId: string, from: 'tab' | 'sidebar') => void;
  handleDragEnd: () => void;
}

export const SidebarTabs = ({
  isSidebarOpen,
  allChats,
  visibleTabIds,
  chatsLoading,
  dragState,
  closeChat,
  moveFromSidebar,
  refreshChats,
  setDragState,
  handleDragStart,
  handleDragEnd,
}: SidebarTabsProps) => {
  const sidebarChats = allChats.filter(chat => !visibleTabIds.includes(chat.id));

  const handleChatClick = (chatId: string) => {
    if (dragState.isDragging) return;
    moveFromSidebar(chatId);
  };

  const handleRefreshChats = () => {
    if (!chatsLoading) {
      refreshChats();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.isDragging) {
      setDragState({ dropZone: 'sidebar' });
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragState({ dropZone: null });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.draggedChatId && dragState.draggedFrom === 'tab') {
      handleDragEnd();
    }
  };

  return (
    <div 
      className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.sidebarOpen : ''} ${
        dragState.isDragging && dragState.dropZone === 'sidebar' ? styles.sidebarDropTarget : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={styles.sidebarHeader}>
        <p className={styles.sidebarTitle}>All Chats</p>
        <button
          onClick={handleRefreshChats}
          className={`${styles.refreshButton} ${chatsLoading ? styles.refreshButtonLoading : ''}`}
          disabled={chatsLoading}
          title="Refresh chats"
        >
          {chatsLoading ? (
            <div className={styles.spinIcon}>
              <Loader2 size={16} />
            </div>
          ) : (
            <IoRefresh size={16} />
          )}
        </button>
      </div>
      
      <div className={styles.chatsList}>
        {chatsLoading && allChats.length === 0 ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinIcon} />
            <span>Loading chats...</span>
          </div>
        ) : sidebarChats.length === 0 ? (
          <div className={styles.emptyState}>
            <span>No chats in sidebar</span>
            <small>Drag tabs here or create new chats</small>
          </div>
        ) : (
          sidebarChats.map((chat) => {
            if (!chat) return null;
            
            const isDraggedItem = dragState.draggedChatId === chat.id;
            
            return (
              <div
                key={chat.id}
                className={`${styles.sidebarItem} ${
                  isDraggedItem ? styles.sidebarItemDragging : ''
                }`}
                onClick={() => handleChatClick(chat.id)}
                draggable={!dragState.isDragging}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', chat.id);
                  handleDragStart(chat.id, 'sidebar');
                }}
                onDragEnd={handleDragEnd}
              >
                <span className={styles.sidebarItemTitle} title={chat.title}>
                  {chat.title}
                </span>
                <button 
                  className={styles.closeButton} 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    closeChat(chat.id); 
                  }}
                  title="Close chat"
                >
                  <IoClose size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {dragState.isDragging && dragState.draggedFrom === 'tab' && (
        <div className={styles.dropIndicator}>
          <div className={styles.dropIndicatorContent}>
            <span>Drop here to move to sidebar</span>
          </div>
        </div>
      )}
    </div>
  );
};