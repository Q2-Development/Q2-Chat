export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length: number;
    pricing: {
      prompt: string;
      completion: string;
    };
    top_provider?: {
      max_completion_tokens?: number;
      is_moderated: boolean;
    };
    per_request_limits?: {
      prompt_tokens: number;
      completion_tokens: number;
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