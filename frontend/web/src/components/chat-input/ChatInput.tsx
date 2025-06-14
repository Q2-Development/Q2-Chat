import { IoAdd, IoOptionsOutline, IoMic, IoChevronDown } from "react-icons/io5";
import { FaArrowUp } from "react-icons/fa6";
import styles from "./ChatInput.module.css";
import { AVAILABLE_MODELS } from "@/types/chat";
import { useState } from "react";

interface ChatInputProps {
    inputValue: string;
    selectedModel: string;
    onInputChange: (text: string) => void;
    onModelChange: (model: string) => void;
    onSend: () => void;
}

export const ChatInput = ({ inputValue, selectedModel, onInputChange, onSend, onModelChange }: ChatInputProps) => {
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const selectedModelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || "GPT-3.5 Turbo";

    return (
        <div className={styles.inputContainer}>
            <textarea
                name="prompt-input"
                className={styles.textarea}
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
            <div className={styles.inputMenuContainer}>
                <div className={styles.leftMenu}>
                    <button className={`${styles.button} ${styles.iconButton} ${styles.addButton}`}>
                        <IoAdd size={24} />
                    </button>
                    <button className={`${styles.button} ${styles.toolsButton}`}>
                        <IoOptionsOutline size={22} />
                        <span>Tools</span>
                    </button>
                </div>
                <div className={styles.modelDropdownContainer}>
                    <button
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className={`${styles.button} ${styles.modelDropdownButton}`}
                    >
                        <span>{selectedModelName}</span>
                        <IoChevronDown size={16} className={`${styles.modelDropdownIcon} ${showModelDropdown ? styles.modelDropdownIconOpen : ''}`} />
                    </button>
                    
                    {showModelDropdown && (
                        <div className={styles.modelDropdownMenu}>
                            {AVAILABLE_MODELS.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onModelChange(model.id);
                                        setShowModelDropdown(false);
                                    }}
                                    className={`${styles.modelDropdownItem} ${
                                        selectedModel === model.id ? styles.modelDropdownItemSelected : ''
                                    }`}
                                >
                                    {model.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className={styles.rightMenu}>
                    <button className={`${styles.button} ${styles.iconButton} ${styles.micButton}`}>
                        <IoMic size={24} />
                    </button>
                    <button onClick={onSend} className={`${styles.button} ${styles.iconButton}`}>
                        <FaArrowUp size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
