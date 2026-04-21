import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Calendar, Key, CheckCircle2, Edit, Power, PowerOff, RefreshCw, DollarSign } from 'lucide-react';
import { UserToken, ModelConfig } from '../../types';
import { storageService } from '../../services/storageService';

const ManageTokens: React.FC = () => {
  const [tokens, setTokens] = useState<UserToken[]>([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingToken, setEditingToken] = useState<UserToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create/Edit Form State
  const [newName, setNewName] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [maxRequestsPerDay, setMaxRequestsPerDay] = useState<number | ''>('');
  const [maxRequestsPerMinute, setMaxRequestsPerMinute] = useState<number | ''>('');
  const [maxTokenUsage, setMaxTokenUsage] = useState<number | ''>('');
  const [maxCostUsage, setMaxCostUsage] = useState<number | ''>('');
  const [tokenType, setTokenType] = useState<'rpd' | 'credits'>('rpd');
  const [tier, setTier] = useState<'standard' | 'plus' | 'true'>('standard');
  const [creditBalance, setCreditBalance] = useState<number | ''>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [regeneratedToken, setRegeneratedToken] = useState<string | null>(null);

  const reloadTokenData = async () => {
    const tokenList = await storageService.getTokens();
    setTokens(tokenList.filter(t => !t.isPrivate));
  };

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await reloadTokenData();
            const models = await storageService.getModels();
            setAvailableModels(models.filter(m => m.isActive));
        } catch (err: any) {
            console.error("Failed to load tokens:", err);
            setError(err.message || "Failed to load tokens from server.");
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  const generateRandomToken = () => {
    return 'rz-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleRegenerateToken = () => {
    const newToken = generateRandomToken();
    setRegeneratedToken(newToken);
  };

  const handleSaveToken = async () => {
    if (!newName) return;

    if (editingToken) {
      // Update existing
      await storageService.updateToken({
        id: editingToken.id,
        name: newName,
        token: regeneratedToken || undefined, // Only send if regenerated
        expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
        accessibleModelIds: selectedModels.length > 0 ? selectedModels : availableModels.map(m => m.id),
        isActive: isActive,
        maxRequestsPerDay: maxRequestsPerDay !== '' ? Number(maxRequestsPerDay) : undefined,
        maxRequestsPerMinute: maxRequestsPerMinute !== '' ? Number(maxRequestsPerMinute) : undefined,
        maxTokenUsage: maxTokenUsage !== '' ? Number(maxTokenUsage) : undefined,
        maxCostUsage: maxCostUsage !== '' ? Number(maxCostUsage) : undefined,
        tokenType: tokenType,
        tier: tier,
        creditBalance: creditBalance !== '' ? Number(creditBalance) : 0
      });
      await reloadTokenData();
      resetForm();
    } else {
      // Create new
      const tokenStr = generateRandomToken();
      const newToken: UserToken = {
          id: `tok_${Date.now()}`,
          name: newName,
          token: tokenStr,
          createdAt: new Date().toISOString(),
          expiresAt: newExpiry ? new Date(newExpiry).toISOString() : null,
          accessibleModelIds: selectedModels.length > 0 ? selectedModels : availableModels.map(m => m.id), // Default to all if none selected
          usageCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
          isActive: isActive,
          maxRequestsPerDay: maxRequestsPerDay !== '' ? Number(maxRequestsPerDay) : undefined,
          maxRequestsPerMinute: maxRequestsPerMinute !== '' ? Number(maxRequestsPerMinute) : undefined,
          maxTokenUsage: maxTokenUsage !== '' ? Number(maxTokenUsage) : undefined,
          maxCostUsage: maxCostUsage !== '' ? Number(maxCostUsage) : undefined,
          tokenType: tokenType,
          tier: tier,
          creditBalance: creditBalance !== '' ? Number(creditBalance) : 0
      };

      await storageService.saveToken(newToken);
      await reloadTokenData();
      setGeneratedToken(tokenStr);
    }
  };

  const startEditing = (token: UserToken) => {
    setEditingToken(token);
    setNewName(token.name);
    setNewExpiry(token.expiresAt ? new Date(token.expiresAt).toISOString().split('T')[0] : '');
    setMaxRequestsPerDay(token.maxRequestsPerDay || '');
    setMaxRequestsPerMinute(token.maxRequestsPerMinute || '');
    setMaxTokenUsage(token.maxTokenUsage || '');
    setMaxCostUsage(token.maxCostUsage || '');
    setTokenType(token.tokenType || 'rpd');
    setTier(token.tier || 'standard');
    setCreditBalance(token.creditBalance !== undefined ? token.creditBalance : '');
    setSelectedModels(token.accessibleModelIds);
    setIsActive(token.isActive);
    setIsCreating(true);
    setGeneratedToken(null);
    setRegeneratedToken(null);
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingToken(null);
    setGeneratedToken(null);
    setRegeneratedToken(null);
    setNewName('');
    setNewExpiry('');
    setMaxRequestsPerDay('');
    setMaxRequestsPerMinute('');
    setMaxTokenUsage('');
    setMaxCostUsage('');
    setTokenType('rpd');
    setTier('standard');
    setCreditBalance('');
    setSelectedModels([]);
    setIsActive(true);
  };

  const handleDeleteToken = async (id: string) => {
    if (window.confirm('Revoke this token permanently?')) {
        await storageService.deleteToken(id);
        await reloadTokenData();
    }
  };

  const toggleTokenStatus = async (token: UserToken) => {
    await storageService.updateToken({
        id: token.id,
        isActive: !token.isActive
    });
    await reloadTokenData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Standard Tokens</h1>
          <p className="text-slate-500">Manage standard user authentication tokens</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsCreating(true); }}
          disabled={isCreating || isLoading}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-reze-600 text-white rounded-lg hover:bg-reze-700 transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Generate Token
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-10 h-10 text-reze-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading tokens...</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
            <PowerOff className="w-5 h-5" />
            <div>
                <p className="font-bold">Error loading data</p>
                <p className="text-sm opacity-90">{error}</p>
            </div>
            <button 
                onClick={() => window.location.reload()} 
                className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-bold transition-colors"
            >
                Retry
            </button>
        </div>
      )}

      {!isLoading && !error && (
        <>
      {/* Creation/Edit Modal/Panel */}
      {isCreating && (
        <div className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-reze-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            {editingToken ? 'Edit Token' : 'Generate New Token'}
          </h3>
          
          {!generatedToken ? (
              <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">User/App Name</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                            placeholder="Client Application A"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date (Optional)</label>
                        <input 
                            type="date" 
                            value={newExpiry}
                            onChange={(e) => setNewExpiry(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Requests / Day</label>
                        <input 
                            type="number" 
                            min="0"
                            value={maxRequestsPerDay}
                            onChange={(e) => setMaxRequestsPerDay(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                            placeholder="Unlimited"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Requests / Minute</label>
                        <input 
                            type="number" 
                            min="0"
                            value={maxRequestsPerMinute}
                            onChange={(e) => setMaxRequestsPerMinute(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                            placeholder="Unlimited"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Overall Token Usage</label>
                        <input 
                            type="number" 
                            min="0"
                            value={maxTokenUsage}
                            onChange={(e) => setMaxTokenUsage(e.target.value === '' ? '' : parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                            placeholder="Unlimited"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Total combined input/output tokens.</p>
                    </div>
                    {tokenType === 'rpd' && (
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Max Budget (USD)</label>
                          <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={maxCostUsage}
                              onChange={(e) => setMaxCostUsage(e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                              placeholder="Unlimited (e.g. 5.00)"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Enforce limit based on calculated token costs.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-reze-50/50 p-4 rounded-xl border border-reze-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Token System</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setTokenType('rpd')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tokenType === 'rpd' ? 'bg-reze-600 border-reze-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-300'}`}
                            >
                                Request/Day
                            </button>
                            <button 
                                onClick={() => setTokenType('credits')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tokenType === 'credits' ? 'bg-reze-600 border-reze-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-300'}`}
                            >
                                Credits
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Pricing Tier</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTier('standard')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tier === 'standard' ? 'bg-reze-600 border-reze-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-300'}`}
                            >
                                Standard
                            </button>
                            <button
                                onClick={() => setTier('plus')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tier === 'plus' ? 'bg-reze-600 border-reze-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-300'}`}
                            >
                                Plus
                            </button>
                            <button
                                onClick={() => setTier('true')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${tier === 'true' ? 'bg-reze-600 border-reze-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-300'}`}
                            >
                                True
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Plus: 80% cache reads. True: actual provider rates (10% cache reads).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tokenType === 'credits' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Balance (USD)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={creditBalance}
                                    onChange={(e) => setCreditBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-reze-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Users can only make requests if balance &gt; 0.</p>
                        </div>
                    )}
                  </div>

                  {editingToken && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Token Key</label>
                        {regeneratedToken ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-white px-3 py-2 rounded border border-reze-200 text-reze-700 font-mono text-sm break-all">
                                        {regeneratedToken}
                                    </code>
                                    <button 
                                        onClick={() => copyToClipboard(regeneratedToken)}
                                        className="p-2 text-slate-400 hover:text-reze-600"
                                        title="Copy"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    New token generated. Click "Update Token" to save this change.
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex-1 font-mono text-slate-500 text-sm">
                                    {editingToken.token.substring(0, 6)}...{editingToken.token.substring(editingToken.token.length - 4)}
                                </div>
                                <button 
                                    onClick={handleRegenerateToken}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-md text-xs font-medium hover:bg-slate-50 hover:text-reze-600 hover:border-reze-200 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                </button>
                            </div>
                        )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Status:</label>
                    <button 
                        onClick={() => setIsActive(!isActive)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                        {isActive ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                        {isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Accessible Models (Select none for All)</label>
                    <div className="flex flex-wrap gap-2">
                        {availableModels.map(model => (
                            <button
                                key={model.id}
                                onClick={() => toggleModelSelection(model.id)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedModels.includes(model.id) ? 'bg-reze-100 border-reze-300 text-reze-700' : 'bg-white border-slate-200 text-slate-600 hover:border-reze-200'}`}
                            >
                                {model.name}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                     <button onClick={resetForm} className="px-4 py-2 text-slate-600 hover:text-slate-900">Cancel</button>
                     <button 
                        onClick={handleSaveToken}
                        disabled={!newName}
                        className="px-4 py-2 bg-reze-600 text-white rounded-lg hover:bg-reze-700 disabled:opacity-50"
                     >
                        {editingToken ? 'Update Token' : 'Generate Key'}
                     </button>
                  </div>
              </div>
          ) : (
              <div className="text-center py-6">
                 <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full text-green-600 mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                 </div>
                 <h4 className="text-xl font-bold text-slate-800 mb-2">Token Generated!</h4>
                 <p className="text-slate-500 mb-6">Make sure to copy it now. You won't be able to see it again.</p>
                 
                 <div className="flex flex-col md:flex-row items-center justify-center gap-2 mb-8">
                    <code className="bg-slate-100 px-4 py-3 rounded-lg text-sm md:text-lg font-mono text-slate-800 border border-slate-200 break-all">
                        {generatedToken}
                    </code>
                    <button 
                        onClick={() => copyToClipboard(generatedToken!)}
                        className="p-3 bg-reze-50 text-reze-600 rounded-lg hover:bg-reze-100 transition-colors"
                        title="Copy to clipboard"
                    >
                        <Copy className="w-5 h-5" />
                    </button>
                 </div>

                 <button onClick={resetForm} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900">
                    Done
                 </button>
              </div>
          )}
        </div>
      )}

      {/* Token List - Mobile Cards */}
      <div className="md:hidden space-y-4">
        {tokens.map(token => (
            <div key={token.id} className={`bg-white p-4 rounded-xl shadow-sm border ${!token.isActive ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                        <div className={`p-1.5 rounded ${token.isActive ? 'bg-reze-50 text-reze-500' : 'bg-slate-100 text-slate-400'}`}>
                            <Key className="w-4 h-4" />
                        </div>
                        <span className={!token.isActive ? 'text-slate-500 decoration-slate-400' : ''}>{token.name}</span>
                        {!token.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Disabled</span>}
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => startEditing(token)}
                            className="text-slate-400 hover:text-reze-600 p-1"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDeleteToken(token.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="text-xs font-mono text-slate-500 mb-3 bg-slate-50 p-2 rounded break-all">
                    {token.token.substring(0, 6)}...{token.token.substring(token.token.length - 4)}
                </div>
                
                {token.maxRequestsPerDay && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-medium uppercase tracking-wider">Daily Usage</span>
                      <span className="text-slate-700 font-bold">{token.usageCount} / {token.maxRequestsPerDay}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          (token.usageCount / token.maxRequestsPerDay) > 0.9 ? 'bg-red-500' : 
                          (token.usageCount / token.maxRequestsPerDay) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                        }`}
                        style={{ width: `${Math.min(100, (token.usageCount / token.maxRequestsPerDay) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {token.maxTokenUsage && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-medium uppercase tracking-wider">Token Usage</span>
                      <span className="text-slate-700 font-bold">{(token.inputTokens + token.outputTokens).toLocaleString()} / {token.maxTokenUsage.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) > 0.9 ? 'bg-red-500' : 
                          ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                        }`}
                        style={{ width: `${Math.min(100, ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {token.tokenType === 'rpd' && token.maxCostUsage && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500 font-medium uppercase tracking-wider">Budget Used</span>
                      <span className="text-slate-700 font-bold">${(token.totalCost || 0).toFixed(2)} / ${token.maxCostUsage.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          ((token.totalCost || 0) / token.maxCostUsage) > 0.9 ? 'bg-red-500' : 
                          ((token.totalCost || 0) / token.maxCostUsage) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                        }`}
                        style={{ width: `${Math.min(100, ((token.totalCost || 0) / token.maxCostUsage) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {token.tokenType === 'credits' && (
                  <div className="mb-4 p-2 bg-reze-50 rounded-lg border border-reze-100 flex justify-between items-center">
                    <span className="text-[10px] text-reze-600 font-bold uppercase tracking-wider">Credit Balance</span>
                    <span className="text-lg font-bold text-reze-700">${(token.creditBalance || 0).toFixed(3)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : <span className="text-green-600">Never Expires</span>}
                    </div>
                    <div className="bg-slate-100 px-2 py-1 rounded-full">
                        {token.accessibleModelIds.length} models
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Token List - Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Usage & Limits</th>
                    <th className="px-6 py-4">Token Hint</th>
                    <th className="px-6 py-4">Expires</th>
                    <th className="px-6 py-4">Access</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {tokens.map(token => (
                    <tr key={token.id} className={`hover:bg-slate-50/50 ${!token.isActive ? 'opacity-60 bg-slate-50' : ''}`}>
                        <td className="px-6 py-4 font-medium text-slate-800">
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`p-1.5 rounded ${token.isActive ? 'bg-reze-50 text-reze-500' : 'bg-slate-100 text-slate-400'}`}>
                                    <Key className="w-4 h-4" />
                                </div>
                                {token.name}
                                {!token.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full ml-2">Disabled</span>}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="space-y-3">
                                {token.maxRequestsPerDay && (
                                    <div className="w-32">
                                        <div className="flex justify-between text-[9px] mb-1">
                                            <span className="text-slate-400 uppercase tracking-tighter">Requests Today</span>
                                            <span className="text-slate-600 font-bold">{Math.round((token.usageCount / token.maxRequestsPerDay) * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${
                                                    (token.usageCount / token.maxRequestsPerDay) > 0.9 ? 'bg-red-500' : 
                                                    (token.usageCount / token.maxRequestsPerDay) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                                                }`}
                                                style={{ width: `${Math.min(100, (token.usageCount / token.maxRequestsPerDay) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {token.maxTokenUsage && (
                                    <div className="w-32">
                                        <div className="flex justify-between text-[9px] mb-1">
                                            <span className="text-slate-400 uppercase tracking-tighter">Token Limit</span>
                                            <span className="text-slate-600 font-bold">{Math.round(((token.inputTokens + token.outputTokens) / token.maxTokenUsage) * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${
                                                    ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) > 0.9 ? 'bg-red-500' : 
                                                    ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                                                }`}
                                                style={{ width: `${Math.min(100, ((token.inputTokens + token.outputTokens) / token.maxTokenUsage) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {token.tokenType === 'rpd' && token.maxCostUsage && (
                                    <div className="w-32">
                                        <div className="flex justify-between text-[9px] mb-1">
                                            <span className="text-slate-400 uppercase tracking-tighter">Budget Limit</span>
                                            <span className="text-slate-600 font-bold">{Math.round(((token.totalCost || 0) / token.maxCostUsage) * 100)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${
                                                    ((token.totalCost || 0) / token.maxCostUsage) > 0.9 ? 'bg-red-500' : 
                                                    ((token.totalCost || 0) / token.maxCostUsage) > 0.7 ? 'bg-amber-500' : 'bg-reze-500'
                                                }`}
                                                style={{ width: `${Math.min(100, ((token.totalCost || 0) / token.maxCostUsage) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {token.tokenType === 'credits' && (
                                    <div className="w-32 bg-reze-50 p-2 rounded-lg border border-reze-100">
                                        <div className="text-[8px] text-reze-600 font-bold uppercase tracking-tight mb-1">Available Credits</div>
                                        <div className="text-sm font-bold text-reze-700 leading-none">
                                            ${(token.creditBalance || 0).toFixed(3)}
                                        </div>
                                    </div>
                                )}
                                {token.tokenType === 'rpd' && !token.maxRequestsPerDay && !token.maxTokenUsage && !token.maxCostUsage && (
                                    <div className="text-[10px] text-slate-400 italic">No limits set</div>
                                )}
                                {token.tokenType === 'credits' && !token.maxRequestsPerDay && !token.maxTokenUsage && (
                                    <div className="text-[10px] text-slate-400 italic">No usage limits</div>
                                )}
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-50 mt-1">
                                    <DollarSign className="w-3 h-3 text-green-600" />
                                    Total Spent: <span className="font-bold text-slate-700">${(token.totalCost || 0).toFixed(3)}</span>
                                </div>
                                {token.tokenType === 'credits' && (
                                    <div className="text-[10px] text-reze-600 flex items-center gap-1 pt-1 border-t border-slate-50 mt-1">
                                        <RefreshCw className="w-3 h-3" />
                                        Balance: <span className="font-bold">${(token.creditBalance || 0).toFixed(3)}</span>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">
                            {token.token.substring(0, 6)}...{token.token.substring(token.token.length - 4)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                            {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : <span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">Never</span>}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex -space-x-1">
                                {token.accessibleModelIds.length > 3 ? (
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">{token.accessibleModelIds.length} models</span>
                                ) : (
                                    token.accessibleModelIds.map((mid, idx) => (
                                        <div key={idx} className="w-6 h-6 rounded-full bg-reze-200 border-2 border-white flex items-center justify-center text-[10px] text-reze-700" title={mid}>
                                            {mid.charAt(0).toUpperCase()}
                                        </div>
                                    ))
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => toggleTokenStatus(token)}
                                    className={`p-1.5 rounded-full transition-colors ${token.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                    title={token.isActive ? "Disable Token" : "Enable Token"}
                                >
                                    {token.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                                </button>
                                <button 
                                    onClick={() => startEditing(token)}
                                    className="p-1.5 text-slate-400 hover:text-reze-600 hover:bg-reze-50 rounded-full transition-colors"
                                    title="Edit Token"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteToken(token.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    title="Revoke Token"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                {tokens.length === 0 && (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                            No tokens generated yet.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
};

export default ManageTokens;
