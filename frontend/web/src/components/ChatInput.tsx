import { IoAdd, IoOptionsOutline, IoMic, IoChevronDown } from "react-icons/io5";
import { FaArrowUp } from "react-icons/fa6";
import styles from "./ChatInput.module.css";
import { AVAILABLE_MODELS } from "@/types/chat";
import { useState } from "react";

interface Props {
    inputValue: string;
    selectedModel: string;
    onInputChange: (text: string) => void;
    onModelChange: (model: string) => void;
    onSend: () => void;
}

export default function ChatInput({ inputValue, selectedModel, onInputChange, onSend, onModelChange }: Props) {
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const selectedModelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || "GPT-3.5 Turbo";

    return (
        <div className={`${styles.inputContainer} p-5 mb-7 max-w-[60%] rounded-3xl bg-neutral-800 container flex flex-col mt-auto self-center`}>
            <textarea
                name="prompt-input"
                className="outline-0 resize-none"
                id="prompt-input" 
                rows={5} 
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                    }
                }}
                placeholder="Ask anything"
            />
            <div className="input-menu-container mt-2.5 flex">
                <div className="flex">
                    <button className="p-2 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl mr-2">
                        <IoAdd size={24} />
                    </button>
                    <button className="py-2 px-3.5 min-w-10 min-h-10 flex justify-center items-center bg-neutral-700 rounded-3xl flex mr-auto">
                        <IoOptionsOutline size={22} />
                        <span className="ml-2 text-sm font-medium">Tools</span>
                    </button>
                </div>
                <div className="relative mx-3">
                    <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="py-2 px-3 flex items-center bg-neutral-700 rounded-lg hover:bg-neutral-600 transition-colors text-sm"
                    >
                        <span className="mr-2">{selectedModelName}</span>
                        <IoChevronDown size={16} className={`transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showModelDropdown && (
                        <div className="absolute bottom-full mb-2 right-0 bg-neutral-700 rounded-lg shadow-lg border border-neutral-600 min-w-48 z-10">
                            {AVAILABLE_MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onModelChange(model.id);
                                        setShowModelDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-600 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                                        selectedModel === model.id ? 'bg-neutral-600 font-medium' : ''
                                    }`}
                                >
                                    {model.name}
                                </button>
                            ))}
                        </div>
                    )}
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
    );
}
