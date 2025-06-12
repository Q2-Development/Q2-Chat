import { IoClose } from "react-icons/io5";

interface Props {
  sidebarTabIds: string[];
  chats: Chat[];
  closeChat: (id: string) => void;
  moveFromSidebar: (id: string) => void;
}

export default function SidebarTabs({
  sidebarTabIds,
  chats,
  closeChat,
  moveFromSidebar,
}: Props) {
  return (
    <div className="w-48 bg-neutral-800 p-2 border-r border-neutral-700">
      <p className="text-sm font-semibold mb-2">More</p>
      {sidebarTabIds.map((id) => {
        const chat = chats.find((c) => c.id === id)!;
        return (
          <div
            key={id}
            className="flex items-center justify-between mb-1 px-2 py-1 rounded hover:bg-neutral-700 cursor-pointer"
            onClick={() => moveFromSidebar(id)}
          >
            <span className="truncate text-sm">{chat.title}</span>
            <button onClick={(e) => { e.stopPropagation(); closeChat(id); }}>
              <IoClose size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
