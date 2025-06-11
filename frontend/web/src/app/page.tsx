"use client";

import { useState, KeyboardEvent, ChangeEvent } from "react";
import type { NextPage } from "next";
import { IoAdd,IoOptionsOutline, IoMic} from "react-icons/io5";
import { FaArrowUp } from "react-icons/fa6";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Home: NextPage = () => {

  return (
    <main className="min-h-screen bg-neutral-900 text-white p-6 border border-red-600 items-center flex flex-col">
      <div className="tabs-container border border-yellow-400 container">These are the tabs</div>
      <div className="chat-container border border-green-600 container">This will hold the messages</div>
      <div className="input-container p-5 max-w-[60%] border rounded-3xl border-neutral-600 bg-neutral-800 container flex flex-col mt-auto">
        <textarea name="prompt-input" className="outline-0 resize-none" id="prompt-input" rows={5}></textarea>
        <div className="input-menu-container mt-2.5 flex">
          <div className="flex">
            <button className="p-2 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl mr-2">
              <IoAdd size={24}/>
            </button>
            <button className="py-2 px-3.5 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl flex mr-auto">
              <IoOptionsOutline size={22} />
              <span className="ml-2 text-sm font-medium">Tools</span>
            </button>
          </div>
          <div className="flex ml-auto">
            <button className="p-2 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl mr-2">
              <IoMic size={24} />
            </button>
            <button className="p-2 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl">
              <FaArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
