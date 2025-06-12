import { IoAdd, IoOptionsOutline, IoMic } from "react-icons/io5";
import { FaArrowUp } from "react-icons/fa6";

interface Props {
    inputValue: string;
    onInputChange: (text: string) => void;
    onSend: () => void;
}

export default function ChatInput({ inputValue, onInputChange, onSend }: Props) {
    return (
        <div className="input-container p-5 mb-7 max-w-[60%] rounded-3xl bg-neutral-800 container flex flex-col mt-auto self-center">
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
