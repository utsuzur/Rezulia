export interface ModelConfig {
  id: string;
  originalId?: string;
  name: string; // The model ID from the provider (e.g., gpt-4)
  providerId: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  isActive: boolean;
  pricingModelId?: string;
  inputPricePer1k?: number;
  outputPricePer1k?: number;
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  type?: 'openai' | 'anthropic';
  removeTopP?: boolean;
  rotationStrategy?: 'circular' | 'progressive';
  tokenId?: string;
  lastUsedKeyIndex?: number;
}

export interface UserToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  accessibleModelIds: string[]; // List of model IDs this token can access
  usageCount: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  maxRequestsPerDay?: number;
  maxRequestsPerMinute?: number;
  maxTokenUsage?: number;
  maxCostUsage?: number; // Budget in USD
  isActive: boolean;
  isPrivate?: boolean;
  tokenType?: 'rpd' | 'credits';
  tier?: 'standard' | 'plus' | 'true';
  creditBalance?: number;
}

export interface AdminConfig {
  themeColor: string;
}

export interface RequestLog {
  id: number;
  tokenId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  originalCost: number;
  timestamp: string;
}

export interface ErrorLog {
  id: number;
  tokenId: string;
  modelId: string;
  providerId: string;
  errorType: 'provider_error' | 'server_error';
  errorMessage: string;
  timestamp: string;
}
