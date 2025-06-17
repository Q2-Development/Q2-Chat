import { useState, useRef, useEffect, Fragment } from 'react';
import { Chat } from '@/types/chat';
import { IoAdd, IoClose } from 'react-icons/io5';
import styles from './ChatTabs.module.css';

interface ChatTabsProps {
  chats: Chat[];
  visibleTabIds: string[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  closeChat: (id: string) => void;
  addNewChat: () => void;
  renameChat: (id: string, newTitle: string) => void;
}

export const ChatTabs = ({
  chats,
  visibleTabIds,
  activeChatId,
  setActiveChatId,
  closeChat,
  addNewChat,
  renameChat,
}: ChatTabsProps) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = (chat: Chat) => {
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
  
  return (
    <div className={styles.tabsContainer}>
      {visibleTabIds.map((id, index) => {
        const chat = chats.find((c) => c.id === id)!;
        if (!chat) return null;

        const isLastTab = index === visibleTabIds.length - 1;
        const tabClassName = id === activeChatId 
            ? `${styles.tab} ${styles.tabActive}` 
            : `${styles.tab} ${styles.tabInactive}`;

        return (
          <Fragment key={id}>
              <div
                className={tabClassName}
                onClick={() => id !== editingTabId && setActiveChatId(id)}
                onDoubleClick={() => handleDoubleClick(chat)}
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
                    <span className={styles.tabTitle}>{chat.title}</span>
                )}
                <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); closeChat(id); }}>
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
      >
        <IoAdd size={20} />
      </button>
    </div>
  );
}