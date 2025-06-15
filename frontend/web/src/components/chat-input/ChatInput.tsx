import { IoAdd, IoOptionsOutline, IoMic, IoChevronDown, IoClose, IoDocumentText, IoImage } from "react-icons/io5";
import { FaArrowUp, FaFileCsv } from "react-icons/fa6";
import styles from "./ChatInput.module.css";
import { AVAILABLE_MODELS, PendingFile } from "@/types/chat";
import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
    inputValue: string;
    selectedModel: string;
    pendingFiles: PendingFile[];
    onInputChange: (text: string) => void;
    onModelChange: (model: string) => void;
    onSend: () => void;
    onAddFiles: (files: FileList | File[]) => Promise<{ success: File[], errors: string[] }>;
    onRemoveFile: (fileId: string) => void;
}

export const ChatInput = ({ 
    inputValue, 
    selectedModel, 
    pendingFiles,
    onInputChange, 
    onSend, 
    onModelChange, 
    onAddFiles,
    onRemoveFile 
}: ChatInputProps) => {
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const selectedModelName = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name || "GPT-3.5 Turbo";
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const result = await onAddFiles(files);
            if (result.errors.length > 0) {
                setErrors(result.errors);
                setTimeout(() => setErrors([]), 5000);
            }
        }
        event.target.value = '';
    };

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const result = await onAddFiles(files);
            if (result.errors.length > 0) {
                setErrors(result.errors);
                setTimeout(() => setErrors([]), 5000);
            }
        }
    }, [onAddFiles]);

    const getFileIcon = (fileType: PendingFile['type']) => {
        switch (fileType) {
            case 'image':
                return <IoImage size={16} className="text-blue-400" />;
            case 'pdf':
                return <IoDocumentText size={16} className="text-red-400" />;
            case 'csv':
                return <FaFileCsv size={16} className="text-green-400" />;
            default:
                return <IoDocumentText size={16} className="text-gray-400" />;
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div 
            className={`${styles.inputContainer} ${isDragOver ? styles.dragOver : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept="image/*,application/pdf,text/csv,application/csv"
                multiple
            />

            {errors.length > 0 && (
                <div className={styles.errorContainer}>
                    {errors.map((error, index) => (
                        <div key={index} className={styles.errorMessage}>
                            {error}
                        </div>
                    ))}
                </div>
            )}

            {pendingFiles.length > 0 && (
                <div className={styles.pendingFilesContainer}>
                    {pendingFiles.map((pendingFile) => (
                        <div key={pendingFile.id} className={styles.pendingFileItem}>
                            {pendingFile.type === 'image' ? (
                                <div className={styles.imagePreview}>
                                    <img 
                                        src={pendingFile.url} 
                                        alt={pendingFile.file.name}
                                        className={styles.previewImage}
                                    />
                                    <div className={styles.imageOverlay}>
                                        <span className={styles.fileName}>{pendingFile.file.name}</span>
                                        <button
                                            onClick={() => onRemoveFile(pendingFile.id)}
                                            className={styles.removeButton}
                                            aria-label="Remove file"
                                        >
                                            <IoClose size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.fileCard}>
                                    <div className={styles.fileInfo}>
                                        {getFileIcon(pendingFile.type)}
                                        <div className={styles.fileDetails}>
                                            <span className={styles.fileName}>{pendingFile.file.name}</span>
                                            <span className={styles.fileSize}>
                                                {formatFileSize(pendingFile.file.size)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemoveFile(pendingFile.id)}
                                        className={styles.removeButton}
                                        aria-label="Remove file"
                                    >
                                        <IoClose size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
    
            {isDragOver && (
                <div className={styles.dragOverlay}>
                    <div className={styles.dragMessage}>
                        <IoAdd size={32} />
                        <span>Drop files here to upload</span>
                        <small>Images, PDFs, and CSVs supported</small>
                    </div>
                </div>
            )}

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
                placeholder="Ask anything..."
            />
            <div className={styles.inputMenuContainer}>
                <div className={styles.leftMenu}>
                    <button onClick={handleAddClick} className={`${styles.button} ${styles.iconButton} ${styles.addButton}`}>
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