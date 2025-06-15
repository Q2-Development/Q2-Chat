import { IoAdd, IoOptionsOutline, IoChevronDown, IoClose, IoDocumentText, IoImage, IoSearch, IoStop } from "react-icons/io5";
import { FaArrowUp } from "react-icons/fa6";
import { Zap, Bot, Loader2 } from "lucide-react";
import styles from "./ChatInput.module.css";
import { PendingFile } from "@/types/chat";
import { OpenRouterModel, getProviderName, POPULAR_MODELS, isPopularModel, getModelCapabilities, modelSupportsTools } from "@/types/models";
import { PROVIDER_ICONS, getProviderIconKey } from "@/components/provider-icons";
import { ModelTooltip } from "@/components/model-tooltip";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

interface ChatInputProps {
    inputValue: string;
    selectedModel: string;
    pendingFiles: PendingFile[];
    models: OpenRouterModel[];
    modelsLoading: boolean;
    modelsError: string | null;
    modelSearch: string;
    isSendingMessage: boolean;
    onInputChange: (text: string) => void;
    onModelChange: (model: string) => void;
    onSend: () => void;
    onStop: () => void;
    onAddFiles: (files: FileList | File[]) => Promise<{ success: File[], errors:string[] }>;
    onRemoveFile: (fileId: string) => void;
    onFetchModels: () => Promise<void>;
    onModelSearch: (search: string) => void;
}

export const ChatInput = ({ 
    inputValue, 
    selectedModel, 
    pendingFiles,
    models,
    modelsLoading,
    modelsError,
    modelSearch,
    isSendingMessage,
    onInputChange, 
    onSend, 
    onStop,
    onModelChange, 
    onAddFiles,
    onRemoveFile,
    onFetchModels,
    onModelSearch
}: ChatInputProps) => {
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [tooltipState, setTooltipState] = useState<{
        visible: boolean;
        model: OpenRouterModel | null;
        position: { x: number; y: number };
    }>({
        visible: false,
        model: null,
        position: { x: 0, y: 0 }
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout>();

    const selectedModelInfo = models.find(m => m.id === selectedModel);
    const selectedModelName = selectedModelInfo?.name || "GPT-4o";
    
    const toolsEnabled = selectedModelInfo ? modelSupportsTools(selectedModelInfo) : false;
    const canSend = (inputValue.trim().length > 0 || pendingFiles.length > 0) && !isSendingMessage;

    const { popularModels, groupedModels } = useMemo(() => {
        let filtered = models;
        
        if (modelSearch.trim()) {
            const searchLower = modelSearch.toLowerCase();
            filtered = models.filter(model => 
                model.name.toLowerCase().includes(searchLower)
            );
        }

        const popular: OpenRouterModel[] = [];
        const regular: OpenRouterModel[] = [];

        filtered.forEach(model => {
            if (isPopularModel(model.id)) {
                popular.push(model);
            } else {
                regular.push(model);
            }
        });

        const sortedPopular = popular.sort((a, b) => {
            const indexA = POPULAR_MODELS.indexOf(a.id as any);
            const indexB = POPULAR_MODELS.indexOf(b.id as any);
            return indexA - indexB;
        });

        const grouped: Record<string, OpenRouterModel[]> = {};
        regular.forEach(model => {
            const provider = getProviderName(model.id);
            if (!grouped[provider]) {
                grouped[provider] = [];
            }
            grouped[provider].push(model);
        });

        const sortedProviders = Object.keys(grouped).sort();
        const result: Record<string, OpenRouterModel[]> = {};
        
        sortedProviders.forEach(provider => {
            result[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name));
        });

        return {
            popularModels: sortedPopular,
            groupedModels: result
        };
    }, [models, modelSearch]);

    const handleModelDropdownToggle = async () => {
        if (!showModelDropdown) {
            await onFetchModels();
        }
        setShowModelDropdown(!showModelDropdown);
    };

    const handleModelHover = useCallback((event: React.MouseEvent, model: OpenRouterModel) => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }

        const modelItemRect = event.currentTarget.getBoundingClientRect();
        const dropdownRect = event.currentTarget.closest(`.${styles.modelDropdownMenu}`)?.getBoundingClientRect();
        
        if (!dropdownRect) return;

        const x = dropdownRect.right + 10;
        const y = modelItemRect.top + modelItemRect.height / 2;

        tooltipTimeoutRef.current = setTimeout(() => {
            setTooltipState({
                visible: true,
                model,
                position: { x, y }
            });
        }, 300);
    }, []);

    const handleModelLeave = useCallback(() => {
        if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
        }
        setTooltipState(prev => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showModelDropdown && !target.closest(`.${styles.modelSelectorContainer}`)) {
                setShowModelDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
            }
        };
    }, [showModelDropdown]);

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

    const getProviderIconComponent = (modelId: string) => {
        const iconKey = getProviderIconKey(modelId);
        const IconComponent = PROVIDER_ICONS[iconKey];
        return IconComponent ? <IconComponent /> : <Bot size={16} />;
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
                accept="image/*,application/pdf"
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
                        <small>Images, PDFs supported</small>
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
                        if (canSend) onSend();
                    }
                }}
                placeholder="Ask anything..."
            />
            
            <div className={styles.inputMenuContainer}>
                <div className={styles.leftMenu}>
                    <button onClick={handleAddClick} className={`${styles.button} ${styles.iconButton}`}>
                        <IoAdd size={24} />
                    </button>
                    <button 
                        className={`${styles.button} ${styles.toolsButton} ${!toolsEnabled ? styles.toolsButtonDisabled : ''}`}
                        disabled={!toolsEnabled}
                        title={toolsEnabled ? "Tools available" : "Current model doesn't support tools"}
                    >
                        <IoOptionsOutline size={22} />
                        <span>Tools</span>
                    </button>
                </div>

                <div className={styles.rightMenu}>
                    <div className={styles.modelSelectorContainer}>
                        <button
                            onClick={handleModelDropdownToggle}
                            className={`${styles.button} ${styles.modelSelectorButton}`}
                        >
                            <span>{selectedModelName}</span>
                            <IoChevronDown 
                                size={16} 
                                className={`${styles.modelDropdownIcon} ${showModelDropdown ? styles.modelDropdownIconOpen : ''}`} 
                            />
                        </button>
                        
                        {showModelDropdown && (
                            <div className={styles.modelDropdownMenu}>
                                <div className={styles.modelSearchContainer}>
                                    <div className={styles.searchIconContainer}>
                                        <IoSearch 
                                            size={16} 
                                            className={styles.searchIcon}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Search models..."
                                            value={modelSearch}
                                            onChange={(e) => onModelSearch(e.target.value)}
                                            className={styles.modelSearchInput}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className={styles.modelList}>
                                    {modelsLoading ? (
                                        <div className={styles.loadingState}>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span style={{ marginLeft: '0.5rem' }}>Loading models...</span>
                                        </div>
                                    ) : modelsError ? (
                                        <div className={styles.errorState}>
                                            Failed to load models. Using GPT-4o as default.
                                        </div>
                                    ) : popularModels.length === 0 && Object.keys(groupedModels).length === 0 ? (
                                        <div className={styles.loadingState}>
                                            No models found matching "{modelSearch}"
                                        </div>
                                    ) : (
                                        <>
                                            {popularModels.length > 0 && (
                                                <div className={styles.providerGroup}>
                                                    <div className={styles.providerHeader}>
                                                        <Zap size={16} />
                                                        Popular
                                                    </div>
                                                    {popularModels.map((model) => (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => {
                                                                onModelChange(model.id);
                                                                setShowModelDropdown(false);
                                                                onModelSearch('');
                                                                handleModelLeave();
                                                            }}
                                                            onMouseEnter={(e) => handleModelHover(e, model)}
                                                            onMouseLeave={handleModelLeave}
                                                            className={`${styles.modelItem} ${
                                                                selectedModel === model.id ? styles.modelItemSelected : ''
                                                            }`}
                                                        >
                                                            <div className={styles.modelName}>{model.name}</div>
                                                            {model.description && (
                                                                <div className={styles.modelDescription}>
                                                                    {model.description.length > 80 
                                                                        ? `${model.description.substring(0, 80)}...` 
                                                                        : model.description
                                                                    }
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {Object.entries(groupedModels).map(([provider, providerModels]) => (
                                                <div key={provider} className={styles.providerGroup}>
                                                    <div className={styles.providerHeader}>
                                                        {getProviderIconComponent(providerModels[0].id)}
                                                        {provider}
                                                    </div>
                                                    {providerModels.map((model) => (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => {
                                                                onModelChange(model.id);
                                                                setShowModelDropdown(false);
                                                                onModelSearch('');
                                                                handleModelLeave();
                                                            }}
                                                            onMouseEnter={(e) => handleModelHover(e, model)}
                                                            onMouseLeave={handleModelLeave}
                                                            className={`${styles.modelItem} ${
                                                                selectedModel === model.id ? styles.modelItemSelected : ''
                                                            }`}
                                                        >
                                                            <div className={styles.modelName}>{model.name}</div>
                                                            {model.description && (
                                                                <div className={styles.modelDescription}>
                                                                    {model.description.length > 80 
                                                                        ? `${model.description.substring(0, 80)}...` 
                                                                        : model.description
                                                                    }
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {isSendingMessage ? (
                        <button onClick={onStop} className={`${styles.button} ${styles.stopButton}`}>
                            <div className={styles.loader}></div>
                            <IoStop size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={onSend}
                            className={`${styles.button} ${styles.iconButton}`}
                            disabled={!canSend}
                            title={canSend ? "Send message" : "Enter a message or add a file to send"}
                        >
                            <FaArrowUp size={18} />
                        </button>
                    )}
                </div>
            </div>

            {tooltipState.model && (
                <ModelTooltip
                    model={tooltipState.model}
                    capabilities={getModelCapabilities(tooltipState.model)}
                    position={tooltipState.position}
                    visible={tooltipState.visible}
                />
            )}
        </div>
    );
};