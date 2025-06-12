import { IoAdd, IoClose } from "react-icons/io5";
import { Fragment } from "react";
import { Chat } from "@/types/chat";

interface Props {
  chats: Chat[];
  visibleTabIds: string[];
  activeChatId: string;
  setActiveChatId: (id: string) => void;
  closeChat: (id: string) => void;
  addNewChat: () => void;
}

export default function ChatTabs({
  chats,
  visibleTabIds,
  activeChatId,
  setActiveChatId,
  closeChat,
  addNewChat,
}: Props) {
  return (
    <div className="flex bg-neutral-800 px-4 pt-3 border-b-3 border-neutral-700 max-w-full">
      {visibleTabIds.map((id, index) => {
        const chat = chats.find((c) => c.id === id)!;
        const isLastTab = index === visibleTabIds.length - 1;
        return (
          <Fragment key={id}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm transition-colors w-3xs min-w-xs ${
                  id === activeChatId ? "bg-neutral-700 font-semibold" : "bg-neutral-800 hover:bg-neutral-700/50"
                }`}
                onClick={() => setActiveChatId(id)}
              >
                <span>{chat.title}</span>
                <button className="flex ml-auto" onClick={(e) => { e.stopPropagation(); closeChat(id); }}>
                  <IoClose size={16} />
                </button>
              </div>
              {!isLastTab && <div className="separator w-[1px] bg-neutral-500 h-[65%] flex self-center mt-1"></div>}
              {isLastTab && (
                <button
                  className="bg-transparent hover:bg-neutral-700 p-1 rounded-md self-center ml-1"
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
