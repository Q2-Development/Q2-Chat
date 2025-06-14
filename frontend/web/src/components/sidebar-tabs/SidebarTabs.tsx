import { Chat } from "@/types/chat";
import { IoClose } from "react-icons/io5";
import styles from "./SidebarTabs.module.css";

interface SidebarTabsProps {
  sidebarTabIds: string[];
  chats: Chat[];
  closeChat: (id: string) => void;
  moveFromSidebar: (id: string) => void;
}

export const SidebarTabs = ({
  sidebarTabIds,
  chats,
  closeChat,
  moveFromSidebar,
}: SidebarTabsProps) => {
  return (
    <div className={styles.sidebarContainer}>
      <p className={styles.sidebarTitle}>More</p>
      {sidebarTabIds.map((id) => {
        const chat = chats.find((c) => c.id === id)!;
        return (
          <div
            key={id}
            className={styles.sidebarItem}
            onClick={() => moveFromSidebar(id)}
          >
            <span className={styles.sidebarItemTitle}>{chat.title}</span>
            <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); closeChat(id); }}>
              <IoClose size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
