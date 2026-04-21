import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Edit2, Save, BarChart2, Clock, ShieldAlert, ArrowLeft, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { clearAttachedUserToken, getAttachedUserToken } from '../services/userTokenCookie';

interface Log {
  id: number;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  originalCost: number;
  timestamp: string;
}

interface TokenData {
  id: string;
  name: string;
  token: string;
  usageCount: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  requestsToday: number;
  maxRequestsPerDay: number | null;
  maxTokenUsage: number | null;
  maxCostUsage: number | null;
  remainingRequestsToday: number | null;
  tokenType?: 'rpd' | 'credits';
  tier?: 'standard' | 'plus' | 'true';
  creditBalance?: number;
  isActive: boolean;
  logs: Log[];
}

const UserToken: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const attachedToken = getAttachedUserToken();
    setToken(attachedToken);

    if (!attachedToken) {
      setLoading(false);
      setError("I dont know you");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch('/api/my-token/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: attachedToken })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to fetch token details');

        setData(json);
        setNewName(json.name);
      } catch {
        clearAttachedUserToken();
        setError("I dont know you");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleUpdateName = async () => {
    if (!data || !token || !newName.trim()) return;

    try {
      const res = await fetch('/api/my-token/name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: newName.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update name');
      setData({ ...data, name: newName.trim() });
      setIsEditingName(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    }
  };

  const graphData = data?.logs ? [...data.logs].reverse().map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Input: log.inputTokens,
    Output: log.outputTokens,
    Cost: log.cost,
    Model: log.modelId
  })) : [];

  const modelUsage = data?.logs ? data.logs.reduce((acc: Record<string, { tokens: number; cost: number; requests: number }>, log) => {
    if (!acc[log.modelId]) {
      acc[log.modelId] = { tokens: 0, cost: 0, requests: 0 };
    }
    acc[log.modelId].tokens += (log.inputTokens + log.outputTokens);
    acc[log.modelId].cost += log.cost;
    acc[log.modelId].requests += 1;
    return acc;
  }, {}) : {};

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-reze-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-reze-200 border-t-reze-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-reze-50 via-white to-emerald-50 flex items-center justify-center px-6">
        <div className="max-w-lg w-full bg-white border border-red-100 rounded-3xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-red-500 mb-5">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">I dont know you</h1>
          <p className="text-slate-500 mb-6">Attach a valid user token from the home page before opening this route.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-reze-50 via-white to-emerald-50 px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-reze-600 transition-colors mb-3">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-slate-900">User Token Usage</h1>
            <p className="text-slate-500 mt-2">Attached token activity, limits, and recent requests.</p>
          </div>
          <button
            onClick={() => {
              clearAttachedUserToken();
              window.location.href = '/';
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:border-red-200 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
            Detach Token
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-sm mb-1">Token Name</div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-sm w-full"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button onClick={handleUpdateName} className="p-1 text-green-600 hover:bg-green-100 rounded">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">{data.name}</div>
                <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-reze-600">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-sm mb-1">Total Tokens</div>
            <div className="font-semibold text-slate-800">{(data.inputTokens + data.outputTokens).toLocaleString()} Tokens</div>
            <div className="text-xs text-slate-400 mt-1">{data.inputTokens.toLocaleString()} in / {data.outputTokens.toLocaleString()} out</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-sm mb-1">Daily Limit</div>
            <div className="font-semibold text-slate-800">
              {data.maxRequestsPerDay ? (
                <span className={data.remainingRequestsToday !== null && data.remainingRequestsToday < 10 ? 'text-red-500' : 'text-green-600'}>
                  {data.remainingRequestsToday} remaining
                </span>
              ) : (
                <span className="text-green-600">Unlimited</span>
              )}
            </div>
            {data.maxRequestsPerDay && <div className="text-xs text-slate-400 mt-1">out of {data.maxRequestsPerDay}</div>}
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-slate-500 text-sm mb-1">{data.tokenType === 'credits' ? 'Credit Balance' : 'Budget Balance'}</div>
            <div className="font-semibold text-slate-800">
              {data.tokenType === 'credits' ? (
                <span className={(data.creditBalance || 0) <= 0 ? 'text-red-500' : 'text-green-600'}>
                  ${(data.creditBalance || 0).toFixed(3)} left
                </span>
              ) : data.maxCostUsage ? (
                <span className={(data.totalCost / data.maxCostUsage) > 0.9 ? 'text-red-500' : 'text-green-600'}>
                  ${(data.maxCostUsage - data.totalCost).toFixed(3)} left
                </span>
              ) : (
                <span className="text-green-600">Unlimited</span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {data.tokenType === 'credits'
                ? `Spent: $${data.totalCost.toFixed(3)}`
                : `Spent: $${data.totalCost.toFixed(3)} ${data.maxCostUsage ? `of $${data.maxCostUsage.toFixed(2)}` : ''}`}
            </div>
          </div>
        </div>

        {Object.keys(modelUsage).length > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-reze-500" />
              Usage by Model
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(modelUsage) as [string, { tokens: number; cost: number; requests: number }][]).sort((a, b) => b[1].tokens - a[1].tokens).map(([modelId, stats]) => (
                <div key={modelId} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs font-mono text-reze-600 mb-2 truncate" title={modelId}>{modelId}</div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-lg font-bold text-slate-800">{stats.tokens.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Tokens</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-green-600">${stats.cost.toFixed(4)}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{stats.requests} reqs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-reze-500" />
            Recent Activity
          </h3>
          <div className="w-full overflow-x-auto pb-4">
            <div className="h-64 min-w-[800px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData}>
                  <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                    formatter={(value: any, name: string) => [name === 'Cost' ? `$${parseFloat(value).toFixed(4)}` : value, name]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Input" fill="#94a3b8" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar yAxisId="left" dataKey="Output" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar yAxisId="right" dataKey="Cost" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-700">Last 50 Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">Input</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Cost (Orig → Adj)</th>
                  <th className="px-4 py-3 text-right">Total Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 font-mono text-reze-600 bg-reze-50/50 rounded inline-block my-1 ml-4 text-[10px] px-2 py-0.5">{log.modelId}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      <div>{log.inputTokens}</div>
                      {log.cacheReadTokens > 0 && <div className="text-[10px] text-blue-500 font-bold">Cache read</div>}
                      {log.cacheWriteTokens > 0 && <div className="text-[10px] text-reze-500 font-bold">Cache write</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{log.outputTokens}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <div className="flex flex-col items-end">
                        <div className="text-green-600 font-bold">${log.cost?.toFixed(4)}</div>
                        {log.originalCost > 0 && Math.abs(log.cost - log.originalCost) > 0.00001 && (
                          <div className="text-[10px] text-slate-400 line-through">${log.originalCost.toFixed(4)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{log.inputTokens + log.outputTokens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserToken;
