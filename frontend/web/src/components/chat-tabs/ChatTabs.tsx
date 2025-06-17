import { useState, useRef, useEffect, Fragment } from 'react';
import { Chat } from '@/types/chat';
import { IoAdd, IoClose, IoMenu, IoPerson } from 'react-icons/io5';
import { useChatStore } from "@/store/chatStore";
import { useUserStore } from '@/store/userStore';
import styles from './ChatTabs.module.css';

interface ChatTabsProps {
  chats: Chat[];
  visibleTabIds: string[];
  activeChatId: string;
  isSidebarOpen: boolean;
  dragState: {
    isDragging: boolean;
    draggedChatId: string | null;
    draggedFrom: 'tab' | 'sidebar' | null;
    dropZone: 'tab' | 'sidebar' | null;
  };
  setActiveChatId: (id: string) => void;
  toggleSidebar: () => void;
  closeChat: (id: string) => void;
  addNewChat: () => void;
  renameChat: (id: string, newTitle: string) => void;
  setDragState: (state: any) => void;
  handleDragStart: (chatId: string, from: 'tab' | 'sidebar') => void;
  handleDragEnd: () => void;
}

export const ChatTabs = ({
  chats,
  visibleTabIds,
  activeChatId,
  isSidebarOpen,
  dragState,
  setActiveChatId,
  toggleSidebar,
  closeChat,
  addNewChat,
  renameChat,
  setDragState,
  handleDragStart,
  handleDragEnd,
}: ChatTabsProps) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    // setUserMenuOpen, 
    // isAuthenticated, 
    // userName, 
    // avatarUrl, 
    // user 
  } = useUserStore();

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (chat: Chat) => {
    if (dragState.isDragging) return;
    setEditingTabId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleRenameConfirm = () => {
    if (editingTabId && editingTitle.trim()) {
      renameChat(editingTabId, editingTitle.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  const handleTabClick = (id: string) => {
    if (dragState.isDragging || editingTabId === id) return;
    setActiveChatId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.isDragging && dragState.draggedFrom === 'sidebar') {
      setDragState({ dropZone: 'tab' });
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
    if (dragState.draggedChatId && dragState.draggedFrom === 'sidebar') {
      handleDragEnd();
    }
  };

  const handleUserMenuClick = () => {
    // setUserMenuOpen(true);
  };

  const getDisplayName = () => {
    // if (isAuthenticated) {
    //   return userName || user?.email?.split('@')[0] || 'User';
    // }
    return 'Guest';
  };
  
  return (
    <div 
      className={`${styles.tabsContainer} ${
        dragState.isDragging && dragState.dropZone === 'tab' ? styles.tabsContainerDropTarget : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button className={styles.hamburgerButton} onClick={toggleSidebar}>
        {isSidebarOpen ? <IoClose size={22} /> : <IoMenu size={22} />}
      </button>
      
      {visibleTabIds.map((id, index) => {
        const chat = chats.find((c) => c.id === id);
        if (!chat) return null;

        const isLastTab = index === visibleTabIds.length - 1;
        const isActive = id === activeChatId;
        const isDraggedItem = dragState.draggedChatId === id;
        
        const tabClassName = `${styles.tab} ${
          isActive ? styles.tabActive : styles.tabInactive
        } ${isDraggedItem ? styles.tabDragging : ''}`;

        return (
          <Fragment key={id}>
              <div
                className={tabClassName}
                onClick={() => handleTabClick(id)}
                onDoubleClick={() => handleDoubleClick(chat)}
                draggable={!dragState.isDragging && editingTabId !== id}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', id);
                  handleDragStart(id, 'tab');
                }}
                onDragEnd={handleDragEnd}
              >
                {editingTabId === id ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleRenameConfirm}
                        onKeyDown={handleKeyDown}
                        className={styles.renameInput}
                    />
                ) : (
                    <span className={styles.tabTitle} title={chat.title}>
                      {chat.title}
                    </span>
                )}
                <button 
                  className={styles.closeButton} 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    closeChat(id); 
                  }}
                  title="Close tab"
                >
                  <IoClose size={16} />
                </button>
              </div>
              {!isLastTab && <div className={styles.separator}></div>}
          </Fragment>
        );
      })}
      
      <button
        className={styles.addButton}
        onClick={addNewChat}
        title="New chat"
      >
        <IoAdd size={20} />
      </button>

      <div className={styles.userSection}>
        <button
          onClick={handleUserMenuClick}
          className={styles.userButton}
          title={`Settings - ${getDisplayName()}`}
        >
          <div className={styles.userAvatar}>
            {/* {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className={styles.avatarImage} />
            ) : (
              <IoPerson size={18} />
            )} */}
          </div>
          <span className={styles.userName}>{getDisplayName()}</span>
        </button>
      </div>

      {dragState.isDragging && dragState.draggedFrom === 'sidebar' && (
        <div className={styles.dropIndicator}>
          <div className={styles.dropIndicatorContent}>
            <span>Drop here to add to tabs</span>
          </div>
        </div>
      )}
    </div>
  );
};