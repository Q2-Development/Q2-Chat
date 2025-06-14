import { IoAdd, IoClose } from "react-icons/io5";
import { Fragment } from "react";
import { Chat } from "@/types/chat";
import styles from "./ChatTabs.module.css";

interface ChatTabsProps {
  chats: Chat[];
  visibleTabIds: string[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  closeChat: (id: string) => void;
  addNewChat: () => void;
}

export const ChatTabs = ({
  chats,
  visibleTabIds,
  activeChatId,
  setActiveChatId,
  closeChat,
  addNewChat,
}: ChatTabsProps) => {
  return (
    <div className={styles.tabsContainer}>
      {visibleTabIds.map((id, index) => {
        const chat = chats.find((c) => c.id === id)!;
        const isLastTab = index === visibleTabIds.length - 1;
        const tabClassName = id === activeChatId 
            ? `${styles.tab} ${styles.tabActive}` 
            : `${styles.tab} ${styles.tabInactive}`;

        return (
          <Fragment key={id}>
              <div
                className={tabClassName}
                onClick={() => setActiveChatId(id)}
              >
                <span>{chat.title}</span>
                <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); closeChat(id); }}>
                  <IoClose size={16} />
                </button>
              </div>
              {!isLastTab && <div className={styles.separator}></div>}
              {isLastTab && (
                <button
                  className={styles.addButton}
                  onClick={addNewChat}
                >
                  <IoAdd size={20} />
                </button>
              )}
          </Fragment>
        );
      })}
    </div>
  );
}
