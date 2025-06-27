import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { IoChevronDown, IoSearch } from "react-icons/io5";
import { Zap, Bot, Loader2 } from "lucide-react";
import { OpenRouterModel, getProviderName, POPULAR_MODELS, isPopularModel, getModelCapabilities, modelSupportsTools } from "@/types/models";
import { PROVIDER_ICONS, getProviderIconKey } from "@/components/provider-icons";
import { ModelTooltip } from "@/components/model-tooltip";
import styles from "./ModelSelector.module.css";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelSearch: string;
  onModelSearch: (search: string) => void;
  onFetchModels: () => Promise<void>;
  
  mode?: 'dropdown' | 'inline';
  placeholder?: string;
  showTooltips?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  
  showTools?: boolean;
  filterByCapabilities?: string[];
}

export const ModelSelector = ({
  value,
  onChange,
  models,
  modelsLoading,
  modelsError,
  modelSearch,
  onModelSearch,
  onFetchModels,
  mode = 'dropdown',
  placeholder = 'Select a model',
  showTooltips = true,
  disabled = false,
  className = '',
  label,
  showTools = false,
  filterByCapabilities = [],
}: ModelSelectorProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    model: OpenRouterModel | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    model: null,
    position: { x: 0, y: 0 }
  });

  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedModelInfo = models.find(m => m.id === value);
  const selectedModelName = selectedModelInfo?.name || placeholder;
  const toolsEnabled = selectedModelInfo ? modelSupportsTools(selectedModelInfo) : false;

  // Filter and group models
  const { popularModels, groupedModels } = useMemo(() => {
    let filtered = models;
    
    // Apply capability filters
    if (filterByCapabilities.length > 0) {
      filtered = models.filter(model => {
        const capabilities = getModelCapabilities(model);
        return filterByCapabilities.every(capability => {
          switch (capability) {
            case 'tools':
              return capabilities.supportsTools;
            case 'vision':
              return capabilities.supportsVision;
            case 'web_search':
              return capabilities.supportsWebSearch;
            case 'reasoning':
              return capabilities.supportsReasoning;
            default:
              return true;
          }
        });
      });
    }
    
    // Apply search filter
    if (modelSearch.trim()) {
      const searchLower = modelSearch.toLowerCase();
      filtered = filtered.filter(model => 
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

    // Sort popular models by their order in POPULAR_MODELS
    const sortedPopular = popular.sort((a, b) => {
      const indexA = POPULAR_MODELS.indexOf(a.id as any);
      const indexB = POPULAR_MODELS.indexOf(b.id as any);
      return indexA - indexB;
    });

    // Group regular models by provider
    const grouped: Record<string, OpenRouterModel[]> = {};
    regular.forEach(model => {
      const provider = getProviderName(model.id);
      if (!grouped[provider]) {
        grouped[provider] = [];
      }
      grouped[provider].push(model);
    });

    // Sort providers and models within each provider
    const sortedProviders = Object.keys(grouped).sort();
    const result: Record<string, OpenRouterModel[]> = {};
    
    sortedProviders.forEach(provider => {
      result[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name));
    });

    return {
      popularModels: sortedPopular,
      groupedModels: result
    };
  }, [models, modelSearch, filterByCapabilities]);

  const handleDropdownToggle = async () => {
    if (!showDropdown) {
      await onFetchModels();
    }
    setShowDropdown(!showDropdown);
  };

  const handleModelSelect = (modelId: string) => {
    onChange(modelId);
    setShowDropdown(false);
    onModelSearch('');
    handleModelLeave();
  };

  const handleModelHover = useCallback((event: React.MouseEvent, model: OpenRouterModel) => {
    if (!showTooltips) return;
    
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    const modelItemRect = event.currentTarget.getBoundingClientRect();
    const dropdownRect = dropdownRef.current?.getBoundingClientRect();
    
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
  }, [showTooltips]);

  const handleModelLeave = useCallback(() => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltipState(prev => ({ ...prev, visible: false }));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDropdown && 
          !dropdownRef.current?.contains(target) && 
          !buttonRef.current?.contains(target)) {
        setShowDropdown(false);
        onModelSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, [showDropdown, onModelSearch]);

  const getProviderIconComponent = (modelId: string) => {
    const iconKey = getProviderIconKey(modelId);
    const IconComponent = PROVIDER_ICONS[iconKey];
    return IconComponent ? <IconComponent /> : <Bot size={16} />;
  };

  const renderDropdownContent = () => (
    <>
      <div className={styles.searchContainer}>
        <div className={styles.searchIconContainer}>
          <IoSearch size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search models..."
            value={modelSearch}
            onChange={(e) => onModelSearch(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </div>
      </div>

      <div className={styles.modelList}>
        {modelsLoading ? (
          <div className={styles.loadingState}>
            <Loader2 className="animate-spin" size={20} />
            <span>Loading models...</span>
          </div>
        ) : modelsError ? (
          <div className={styles.errorState}>
            {modelsError}
          </div>
        ) : popularModels.length === 0 && Object.keys(groupedModels).length === 0 ? (
          <div className={styles.loadingState}>
            No models found matching &quot;{modelSearch}&quot;
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
                    onClick={() => handleModelSelect(model.id)}
                    onMouseEnter={(e) => handleModelHover(e, model)}
                    onMouseLeave={handleModelLeave}
                    className={`${styles.modelItem} ${
                      value === model.id ? styles.modelItemSelected : ''
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
                    onClick={() => handleModelSelect(model.id)}
                    onMouseEnter={(e) => handleModelHover(e, model)}
                    onMouseLeave={handleModelLeave}
                    className={`${styles.modelItem} ${
                      value === model.id ? styles.modelItemSelected : ''
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
    </>
  );

  if (mode === 'inline') {
    return (
      <div className={`${styles.inlineContainer} ${className}`}>
        {label && <label className={styles.label}>{label}</label>}
        
        <div className={styles.inlineSelector}>
          <button
            ref={buttonRef}
            onClick={handleDropdownToggle}
            disabled={disabled}
            className={`${styles.inlineButton} ${showDropdown ? styles.inlineButtonOpen : ''}`}
          >
            <div className={styles.selectedModel}>
              <div className={styles.modelInfo}>
                <span className={styles.modelName}>{selectedModelName}</span>
                {selectedModelInfo && (
                  <span className={styles.modelProvider}>
                    {getProviderName(selectedModelInfo.id)}
                  </span>
                )}
              </div>
              {showTools && toolsEnabled && (
                <span className={styles.toolsBadge}>Tools</span>
              )}
            </div>
            <IoChevronDown 
              size={16} 
              className={`${styles.dropdownIcon} ${showDropdown ? styles.dropdownIconOpen : ''}`} 
            />
          </button>

          {showDropdown && (
            <div ref={dropdownRef} className={styles.inlineDropdown}>
              {renderDropdownContent()}
            </div>
          )}
        </div>

        {showTooltips && tooltipState.model && (
          <ModelTooltip
            model={tooltipState.model}
            capabilities={getModelCapabilities(tooltipState.model)}
            position={tooltipState.position}
            visible={tooltipState.visible}
          />
        )}
      </div>
    );
  }

  // Default dropdown mode (for ChatInput)
  return (
    <div className={`${styles.dropdownContainer} ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleDropdownToggle}
        disabled={disabled}
        className={`${styles.dropdownButton} ${showDropdown ? styles.dropdownButtonOpen : ''}`}
      >
        <span className={styles.buttonText}>{selectedModelName}</span>
        <IoChevronDown 
          size={16} 
          className={`${styles.dropdownIcon} ${showDropdown ? styles.dropdownIconOpen : ''}`} 
        />
      </button>
      
      {showDropdown && (
        <div ref={dropdownRef} className={styles.dropdown}>
          {renderDropdownContent()}
        </div>
      )}

      {showTooltips && tooltipState.model && (
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