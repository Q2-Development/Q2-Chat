export interface OpenRouterModel {
    id: string;
    name: string;
    created: number;
    description?: string;
    architecture: {
      input_modalities: string[];
      output_modalities: string[];
      tokenizer: string;
    };
    top_provider: {
      is_moderated: boolean;
      max_completion_tokens?: number;
    };
    pricing: {
      prompt: string;
      completion: string;
      image?: string;
      request?: string;
      input_cache_read?: string;
      input_cache_write?: string;
      web_search?: string;
      internal_reasoning?: string;
    };
    context_length: number;
    hugging_face_id?: string;
    per_request_limits?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    };
    supported_parameters?: string[];
  }
  
  export interface ModelCapabilities {
    supportsTools: boolean;
    supportsVision: boolean;
    supportsWebSearch: boolean;
    supportsReasoning: boolean;
    contextLength: number;
    inputModalities: string[];
    outputModalities: string[];
    pricing: {
      prompt: number;
      completion: number;
    };
  }
  
  export interface GroupedModels {
    [providerName: string]: OpenRouterModel[];
  }
  
  export interface OpenRouterResponse {
    data: OpenRouterModel[];
  }
  
  export const getProviderName = (modelId: string): string => {
    const provider = modelId.split('/')[0]?.toLowerCase() || 'unknown';
    
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google', 
      'meta-llama': 'Meta',
      'microsoft': 'Microsoft',
      'cohere': 'Cohere',
      'mistralai': 'Mistral',
      'perplexity': 'Perplexity',
      'deepseek': 'DeepSeek'
    };
    
    return providerNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };
  
  export const POPULAR_MODELS = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro',
    'meta-llama/llama-3.1-405b-instruct',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-opus'
  ] as const;
  
  export type PopularModelId = typeof POPULAR_MODELS[number];
  
  export const isPopularModel = (modelId: string): boolean => {
    return POPULAR_MODELS.includes(modelId as PopularModelId);
  };
  
  export const getModelCapabilities = (model: OpenRouterModel): ModelCapabilities => {
    const supportsVision = model.architecture.input_modalities.includes('image');
    
    const toolsParams = ['functions', 'function_call', 'tools', 'tool_choice'];
    const supportsTools = model.supported_parameters?.some(param => 
      toolsParams.some(toolParam => param.toLowerCase().includes(toolParam))
    ) || false;
    
    const supportsWebSearch = model.pricing.web_search !== undefined && model.pricing.web_search !== '0';
    
    const supportsReasoning = model.pricing.internal_reasoning !== undefined && 
      model.pricing.internal_reasoning !== '0';
    
    return {
      supportsTools,
      supportsVision,
      supportsWebSearch,
      supportsReasoning,
      contextLength: model.context_length,
      inputModalities: model.architecture.input_modalities,
      outputModalities: model.architecture.output_modalities,
      pricing: {
        prompt: parseFloat(model.pricing.prompt),
        completion: parseFloat(model.pricing.completion)
      }
    };
  };
  
  export const formatContextLength = (contextLength: number): string => {
    if (contextLength >= 1000000) {
      return `${(contextLength / 1000000).toFixed(1)}M`;
    } else if (contextLength >= 1000) {
      return `${Math.round(contextLength / 1000)}K`;
    }
    return contextLength.toString();
  };
  
  export const formatPricing = (price: number): string => {
    if (price === 0) return 'Free';
    if (price < 0.000001) return '<$0.000001';
    if (price < 0.001) return `${(price * 1000000).toFixed(1)}µ`;
    if (price < 1) return `${(price * 1000).toFixed(2)}m`;
    return `${price.toFixed(3)}`;
  };
  
  export const modelSupportsTools = (model: OpenRouterModel | undefined): boolean => {
    if (!model) return false;
    return getModelCapabilities(model).supportsTools;
  };