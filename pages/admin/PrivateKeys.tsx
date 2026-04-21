import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, RefreshCw, Shield, Globe, Edit2, Save, X, Search, Check, ChevronDown } from 'lucide-react';
import { UserToken, Provider, ModelConfig } from '../../types';
import { storageService } from '../../services/storageService';

const PrivateKeys: React.FC = () => {
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Private Token Form State
  const [newName, setNewName] = useState('');
  const [newTier, setNewTier] = useState<'standard' | 'plus' | 'true'>('standard');
  const [newTokenType, setNewTokenType] = useState<'rpd' | 'credits'>('rpd');
  const [newDailyLimit, setNewDailyLimit] = useState('');
  const [newCreditBalance, setNewCreditBalance] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Edit token state
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<'standard' | 'plus' | 'true'>('standard');
  const [editTokenType, setEditTokenType] = useState<'rpd' | 'credits'>('rpd');
  const [editDailyLimit, setEditDailyLimit] = useState('');
  const [editCreditBalance, setEditCreditBalance] = useState('');
  const [regenTokenStr, setRegenTokenStr] = useState<string | null>(null);

  // Private Provider Form State
  const [isAddingProvider, setIsAddingProvider] = useState<string | null>(null); // tokenId
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderUrl, setNewProviderUrl] = useState('');
  const [newProviderKey, setNewProviderKey] = useState('');
  const [newProviderType, setNewProviderType] = useState<'openai' | 'anthropic'>('openai');
  const [newRotationStrategy, setNewRotationStrategy] = useState<'circular' | 'progressive'>('circular');
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const allTokens = await storageService.getTokens();
        setTokens(allTokens.filter(t => t.isPrivate));
        setProviders(await storageService.getProviders());
        setModels(await storageService.getModels());
    } catch (err) {
        console.error("Failed to load private data:", err);
    } finally {
        setIsLoading(false);
    }
  };

  const generateRandomToken = () => {
    return 'rzp-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreatePrivateToken = async () => {
    if (!newName) return;
    const tokenStr = generateRandomToken();
    const newToken: UserToken = {
        id: `priv_${Date.now()}`,
        name: newName,
        token: tokenStr,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        accessibleModelIds: ['*'],
        usageCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        isActive: true,
        isPrivate: true,
        tokenType: newTokenType,
        tier: newTier,
        maxRequestsPerDay: newTokenType === 'rpd' && newDailyLimit ? parseInt(newDailyLimit) : undefined,
        creditBalance: newTokenType === 'credits' && newCreditBalance ? parseFloat(newCreditBalance) : 0,
    };
    await storageService.saveToken(newToken);
    setGeneratedToken(tokenStr);
    loadData();
  };

  const handleDeleteToken = async (id: string) => {
    if (window.confirm('Revoke this private key and delete all its dedicated pools?')) {
        await storageService.deleteToken(id);
        const privateProviders = providers.filter(p => p.tokenId === id);
        for (const p of privateProviders) {
            await storageService.deleteProvider(p.id);
        }
        loadData();
    }
  };

  const handleEditToken = (token: UserToken) => {
    setEditingTokenId(token.id);
    setEditTier((token.tier as 'standard' | 'plus' | 'true') || 'standard');
    setEditTokenType((token.tokenType as 'rpd' | 'credits') || 'rpd');
    setEditDailyLimit(token.maxRequestsPerDay ? String(token.maxRequestsPerDay) : '');
    setEditCreditBalance(token.creditBalance ? String(token.creditBalance) : '');
    setRegenTokenStr(null);
  };

  const handleRegenToken = async (tokenId: string) => {
    if (!window.confirm('Regenerate this private key? The old key will stop working immediately.')) return;
    const newTokenStr = generateRandomToken();
    await storageService.updateToken({ id: tokenId, token: newTokenStr, isPrivate: true });
    setRegenTokenStr(newTokenStr);
    loadData();
  };

  const handleSaveTokenEdit = async (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId);
    await storageService.updateToken({
        id: tokenId,
        isActive: token?.isActive ?? true,
        isPrivate: true,
        tier: editTier,
        tokenType: editTokenType,
        maxRequestsPerDay: editTokenType === 'rpd' && editDailyLimit ? parseInt(editDailyLimit) : undefined,
        creditBalance: editTokenType === 'credits' && editCreditBalance ? parseFloat(editCreditBalance) : 0,
    });
    setEditingTokenId(null);
    loadData();
  };

  const handleFetchModels = async () => {
    if (!newProviderUrl) return;
    setIsFetching(true);
    try {
        const response = await fetch('/api/admin/fetch-models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': document.cookie.match(/reze_csrf=([^;]+)/)?.[1] || ''
            },
            body: JSON.stringify({ url: newProviderUrl, key: newProviderKey, type: newProviderType })
        });
        const data = await response.json();
        let modelList = Array.isArray(data) ? data.map((m: any) => m.id) : (data.data || []).map((m: any) => m.id);
        setFetchedModels(modelList);
    } catch (e) {
        console.error("Fetch failed", e);
    } finally {
        setIsFetching(false);
    }
  };

  const handleSaveProvider = async (tokenId: string) => {
    const providerId = `p_priv_${Date.now()}`;
    const provider: Provider = {
        id: providerId,
        name: newProviderName,
        baseUrl: newProviderUrl,
        apiKey: newProviderKey,
        type: newProviderType,
        rotationStrategy: newRotationStrategy,
        tokenId: tokenId
    };
    await storageService.saveProvider(provider);
    
    const newModels: ModelConfig[] = fetchedModels.map(mid => ({
        id: mid,
        name: mid,
        providerId: providerId,
        maxInputTokens: 4096,
        maxOutputTokens: 4096,
        isActive: true
    }));
    await storageService.saveModels(newModels);
    
    setIsAddingProvider(null);
    setNewProviderName('');
    setNewProviderUrl('');
    setNewProviderKey('');
    setFetchedModels([]);
    loadData();
  };

  const handleDeleteProvider = async (id: string) => {
      if (window.confirm('Delete this private provider?')) {
          await storageService.deleteProvider(id);
          loadData();
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Private Keys</h1>
          <p className="text-slate-500">Dedicated model and provider pools</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Private Key
        </button>
      </div>

      {isCreating && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-in fade-in slide-in-from-top-4">
              {!generatedToken ? (
                  <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Create Private Key</h3>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Key Name (e.g. My-Private-App)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
                              <select value={newTier} onChange={e => setNewTier(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none">
                                  <option value="standard">Standard</option>
                                  <option value="plus">Plus</option>
                                  <option value="true">True</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Billing Type</label>
                              <select value={newTokenType} onChange={e => setNewTokenType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none">
                                  <option value="rpd">Daily Limit (RPD)</option>
                                  <option value="credits">Credits</option>
                              </select>
                          </div>
                      </div>
                      {newTokenType === 'rpd' && (
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Daily Request Limit</label>
                              <input type="number" value={newDailyLimit} onChange={e => setNewDailyLimit(e.target.value)} placeholder="e.g. 100 (leave blank for unlimited)" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                          </div>
                      )}
                      {newTokenType === 'credits' && (
                          <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Starting Credit Balance ($)</label>
                              <input type="number" step="0.01" value={newCreditBalance} onChange={e => setNewCreditBalance(e.target.value)} placeholder="e.g. 10.00" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" />
                          </div>
                      )}
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                          <button onClick={handleCreatePrivateToken} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Generate</button>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-4">
                      <h4 className="text-xl font-bold text-green-600 mb-2">Private Key Generated!</h4>
                      <code className="block bg-slate-100 p-4 rounded-lg font-mono mb-4">{generatedToken}</code>
                      <button onClick={() => { setIsCreating(false); setGeneratedToken(null); setNewName(''); setNewTier('standard'); setNewTokenType('rpd'); setNewDailyLimit(''); setNewCreditBalance(''); }} className="px-6 py-2 bg-slate-800 text-white rounded-lg">Done</button>
                  </div>
              )}
          </div>
      )}

      {isLoading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : (
          <div className="grid grid-cols-1 gap-6">
              {tokens.map(token => (
                  <div key={token.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <Shield className="w-5 h-5 text-slate-600" />
                              <h3 className="font-bold text-slate-800 text-lg">{token.name}</h3>
                              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded uppercase font-bold text-slate-600">Private</span>
                              <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                                  token.tier === 'true' ? 'bg-green-100 text-green-700' : token.tier === 'plus' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                              }`}>{token.tier || 'standard'}</span>
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase font-bold">
                                  {token.tokenType === 'credits' ? `$${(token.creditBalance || 0).toFixed(2)} credits` : `RPD${token.maxRequestsPerDay ? `: ${token.maxRequestsPerDay}/day` : ': unlimited'}`}
                              </span>
                          </div>
                          <div className="flex items-center gap-2">
                              <button onClick={() => handleEditToken(token)} className="text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteToken(token.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      </div>

                      {editingTokenId === token.id && (
                          <div className="p-4 bg-yellow-50 border-b border-yellow-200 space-y-3">
                              <h4 className="text-sm font-bold text-slate-700">Edit Token Settings</h4>
                              <div className="grid grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Tier</label>
                                      <select value={editTier} onChange={e => setEditTier(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm">
                                          <option value="standard">Standard</option>
                                          <option value="plus">Plus</option>
                                          <option value="true">True</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Billing Type</label>
                                      <select value={editTokenType} onChange={e => setEditTokenType(e.target.value as any)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm">
                                          <option value="rpd">Daily Limit (RPD)</option>
                                          <option value="credits">Credits</option>
                                      </select>
                                  </div>
                              </div>
                              {editTokenType === 'rpd' && (
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Daily Request Limit</label>
                                      <input type="number" value={editDailyLimit} onChange={e => setEditDailyLimit(e.target.value)} placeholder="Leave blank for unlimited" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                                  </div>
                              )}
                              {editTokenType === 'credits' && (
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Credit Balance ($)</label>
                                      <input type="number" step="0.01" value={editCreditBalance} onChange={e => setEditCreditBalance(e.target.value)} placeholder="e.g. 10.00" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
                                  </div>
                              )}
                              <div className="border-t pt-3">
                                  <label className="block text-xs font-medium text-slate-500 mb-2">Regenerate Key</label>
                                  {regenTokenStr && editingTokenId === token.id ? (
                                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                          <p className="text-xs text-green-700 mb-1 font-medium">New key (copy it now):</p>
                                          <code className="block font-mono text-sm text-green-900 break-all">{regenTokenStr}</code>
                                      </div>
                                  ) : (
                                      <button onClick={() => handleRegenToken(token.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg hover:bg-yellow-100 transition-colors">
                                          <RefreshCw className="w-3.5 h-3.5" />
                                          Regenerate Key
                                      </button>
                                  )}
                              </div>
                              <div className="flex justify-end gap-2">
                                  <button onClick={() => { setEditingTokenId(null); setRegenTokenStr(null); }} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
                                  <button onClick={() => handleSaveTokenEdit(token.id)} className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg">Save</button>
                              </div>
                          </div>
                      )}
                      
                      <div className="p-6">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dedicated Pool</h4>
                              <button 
                                onClick={() => setIsAddingProvider(token.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors"
                              >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add Provider
                              </button>
                          </div>

                          {isAddingProvider === token.id && (
                              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <input 
                                        type="text" 
                                        value={newProviderName} 
                                        onChange={e => setNewProviderName(e.target.value)} 
                                        placeholder="Provider Name" 
                                        className="px-3 py-2 border rounded-lg"
                                      />
                                      <select 
                                        value={newProviderType} 
                                        onChange={e => setNewProviderType(e.target.value as any)} 
                                        className="px-3 py-2 border rounded-lg"
                                      >
                                          <option value="openai">OpenAI Compatible</option>
                                          <option value="anthropic">Anthropic</option>
                                      </select>
                                      <input 
                                        type="text" 
                                        value={newProviderUrl} 
                                        onChange={e => setNewProviderUrl(e.target.value)} 
                                        placeholder="Base URL" 
                                        className="md:col-span-2 px-3 py-2 border rounded-lg"
                                      />
                                      <input 
                                        type="text" 
                                        value={newProviderKey} 
                                        onChange={e => setNewProviderKey(e.target.value)} 
                                        placeholder="API Key(s)" 
                                        className="md:col-span-2 px-3 py-2 border rounded-lg font-mono text-sm"
                                      />
                                  </div>
                                  <div className="flex items-center justify-between">
                                      <div className="text-xs text-slate-500">
                                          {isFetching ? 'Fetching models...' : fetchedModels.length > 0 ? `${fetchedModels.length} models found` : 'Discover models first'}
                                      </div>
                                      <button onClick={handleFetchModels} className="px-3 py-1.5 text-xs bg-white border rounded hover:bg-slate-50">Fetch Models</button>
                                  </div>
                                  <div className="flex justify-end gap-3 pt-2 border-t">
                                      <button onClick={() => setIsAddingProvider(null)} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
                                      <button 
                                        onClick={() => handleSaveProvider(token.id)} 
                                        disabled={fetchedModels.length === 0}
                                        className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg disabled:opacity-50"
                                      >
                                          Save Pool
                                      </button>
                                  </div>
                              </div>
                          )}

                          <div className="space-y-3">
                              {providers.filter(p => p.tokenId === token.id).length === 0 ? (
                                  <p className="text-center py-6 text-slate-400 italic text-sm border-2 border-dashed border-slate-100 rounded-xl">No dedicated providers yet. Add one to start your pool.</p>
                              ) : (
                                  providers.filter(p => p.tokenId === token.id).map(provider => (
                                      <div key={provider.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl group hover:border-slate-300 transition-colors shadow-sm">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-slate-50 rounded-lg"><Globe className="w-4 h-4 text-slate-500" /></div>
                                              <div>
                                                  <div className="font-bold text-slate-800 flex items-center gap-2">
                                                      {provider.name}
                                                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase text-slate-500">{provider.type}</span>
                                                  </div>
                                                  <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{provider.baseUrl}</div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <div className="text-right">
                                                  <div className="text-xs font-bold text-slate-600">{models.filter(m => m.providerId === provider.id).length} Models</div>
                                                  <div className="text-[10px] text-slate-400">Isolated ID Format: <code>{token.name}-(id)</code></div>
                                              </div>
                                              <button onClick={() => handleDeleteProvider(provider.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              ))}
              {tokens.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-800">No Private Keys</h3>
                      <p className="text-slate-500">Create your first private key to set up dedicated pools.</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default PrivateKeys;
