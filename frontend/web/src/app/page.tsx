"use client";

import { useState } from "react";
import ChatTabs from "@/components/ChatTabs";
import SidebarTabs from "@/components/SidebarTabs";
import ChatBody from "@/components/ChatBody";
import ChatInput from "@/components/ChatInput";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  input: string;
}

const MAX_VISIBLE_TABS = 4;

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([
    { id: "1", title: "New Chat", messages: [], input: "" },
  ]);
  const [visibleTabIds, setVisibleTabIds] = useState<string[]>(["1"]);
  const [sidebarTabIds, setSidebarTabIds] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState("1");

  const activeChat = chats.find((c) => c.id === activeChatId)!;

  const handleInputChange = (text: string) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId ? { ...chat, input: text } : chat
      )
    );
  };

  const handleSendMessage = () => {
    if (!activeChat.input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: activeChat.input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, userMessage], input: "" }
          : chat
      )
    );

    setTimeout(() => {
      const assistantReply: Message = {
        id: (Date.now() + 1).toString(),
        text: "Here's a helpful reply!",
        isUser: false,
        timestamp: new Date(),
      };

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, assistantReply] }
            : chat
        )
      );
    }, 1000);
  };

  const addNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      input: "",
    };

    setChats((prev) => [...prev, newChat]);
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const movedToSidebar = visibleTabIds[0];
      setVisibleTabIds((prev) => [...prev.slice(1), newChat.id]);
      setSidebarTabIds((prev) => [movedToSidebar, ...prev]);
    } else {
      setVisibleTabIds((prev) => [...prev, newChat.id]);
    }
    setActiveChatId(newChat.id);
  };

  const closeChat = (chatId: string) => {
    if (chats.length <= 1) return;
    const isVisible = visibleTabIds.includes(chatId);

    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setVisibleTabIds((prev) => prev.filter((id) => id !== chatId));
    setSidebarTabIds((prev) => prev.filter((id) => id !== chatId));

    if (isVisible && sidebarTabIds.length > 0) {
      const toPromote = sidebarTabIds[0];
      setVisibleTabIds((prev) => [...prev, toPromote]);
      setSidebarTabIds((prev) => prev.slice(1));
    }

    if (activeChatId === chatId) {
      setActiveChatId(visibleTabIds.find((id) => id !== chatId) || chats[0].id);
    }
  };

  const moveFromSidebar = (chatId: string) => {
    if (visibleTabIds.length >= MAX_VISIBLE_TABS) {
      const toSidebar = visibleTabIds[0];
      setVisibleTabIds((prev) => [...prev.slice(1), chatId]);
      setSidebarTabIds((prev) => [toSidebar, ...prev.filter((id) => id !== chatId)]);
    } else {
      setVisibleTabIds((prev) => [...prev, chatId]);
      setSidebarTabIds((prev) => prev.filter((id) => id !== chatId));
    }
    setActiveChatId(chatId);
  };

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
          onInputChange={handleInputChange}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
