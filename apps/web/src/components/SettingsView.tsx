'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Cpu,
  CloudRain,
  Car,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Download,
  Upload,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '@/lib/settings-store';

interface SettingsViewProps {
  onClose?: () => void;
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaveBanner('Settings saved successfully!');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all configurations to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
      setSaveBanner('Settings reset to defaults.');
      setTimeout(() => setSaveBanner(null), 3000);
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'surgepilot-config.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        setSettings(merged);
        saveSettings(merged);
        setSaveBanner('Configuration imported successfully!');
        setTimeout(() => setSaveBanner(null), 3000);
      } catch (err) {
        alert('Invalid JSON configuration file.');
      }
    };
    reader.readAsText(file);
  };

  const testSupabaseConnection = async () => {
    const url = settings.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl;
    const key = settings.supabaseServiceRoleKey || settings.supabaseAnonKey || DEFAULT_SETTINGS.supabaseAnonKey;

    if (!url) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Please provide a Supabase URL first.',
      });
      return;
    }
    setTestStatus({ loading: true });
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: url,
          supabaseKey: key,
        }),
      });
      const data = await res.json();
      setTestStatus({
        loading: false,
        success: data.ok,
        message: data.ok ? data.message : data.error || 'Connection failed.',
      });
    } catch (e: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: e?.message || 'Failed to ping test endpoint.',
      });
    }
  };

  const handleSeedData = async () => {
    setTestStatus({ loading: true, message: 'Seeding demo hotspots into Supabase...' });
    try {
      const res = await fetch('/api/settings/seed-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabaseUrl: settings.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl,
          supabaseKey: settings.supabaseServiceRoleKey || settings.supabaseAnonKey || DEFAULT_SETTINGS.supabaseAnonKey,
        }),
      });
      const data = await res.json();
      setTestStatus({
        loading: false,
        success: data.ok,
        message: data.ok ? data.message : data.error || 'Failed to seed demo data.',
      });
    } catch (e: any) {
      setTestStatus({ loading: false, success: false, message: e?.message || 'Failed to seed data.' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121f] text-slate-100 overflow-y-auto">
      {/* Top Banner Actions */}
      <div className="p-4 border-b border-white/10 bg-[#111726]/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            System & API Settings
          </h2>
          <p className="text-xs text-zinc-400">
            Configure PostGIS, Vertex AI, Scrapers, and Driver preferences
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>

      {/* Success/Notification Toast */}
      {saveBanner && (
        <div className="mx-4 mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      <div className="p-4 space-y-6 max-w-4xl">
        {/* Section 1: Supabase PostGIS Configuration */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Supabase PostGIS Database</h3>
                <p className="text-[11px] text-zinc-400">
                  Realtime geospatial tables: <code className="text-emerald-300 font-mono">urban_hex_grids</code> & <code className="text-emerald-300 font-mono">live_profit_hotspots</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedData}
                disabled={testStatus.loading}
                title="Populate your Supabase tables with sample Cairo metro surge hotspots"
                className="px-2.5 py-1 text-xs rounded-lg bg-[#172033] hover:bg-[#1e2a42] border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Database className="w-3 h-3 text-emerald-400" />
                Seed Sample Data
              </button>

              <button
                onClick={testSupabaseConnection}
                disabled={testStatus.loading}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#1e2a42] hover:bg-[#253554] border border-white/10 text-emerald-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${testStatus.loading ? 'animate-spin' : ''}`} />
                Test Connection
              </button>
            </div>
          </div>

          {testStatus.message && (
            <div
              className={`mb-4 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                testStatus.success
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/30 text-red-300'
              }`}
            >
              {testStatus.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={settings.supabaseUrl}
                onChange={(e) => handleChange('supabaseUrl', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-300">
                  Supabase Anon Key (Public)
                </label>
                <button
                  type="button"
                  onClick={() => toggleShowSecret('anonKey')}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {showSecrets.anonKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSecrets.anonKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showSecrets.anonKey ? 'text' : 'password'}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={settings.supabaseAnonKey}
                onChange={(e) => handleChange('supabaseAnonKey', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-300">
                  Supabase Service Role Key (Backend Edge Mutations)
                </label>
                <button
                  type="button"
                  onClick={() => toggleShowSecret('serviceKey')}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {showSecrets.serviceKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSecrets.serviceKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showSecrets.serviceKey ? 'text' : 'password'}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={settings.supabaseServiceRoleKey}
                onChange={(e) => handleChange('supabaseServiceRoleKey', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Google Vertex AI & Cloud Architecture */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Vertex AI & ML Pipeline</h3>
              <p className="text-[11px] text-zinc-400">
                Gradient Booster matrix model for 30-minute advance surge predictions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                GCP Project ID
              </label>
              <input
                type="text"
                placeholder="rideshare-profit-prod"
                value={settings.gcpProjectId}
                onChange={(e) => handleChange('gcpProjectId', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                GCP Region
              </label>
              <input
                type="text"
                placeholder="us-central1"
                value={settings.gcpRegion}
                onChange={(e) => handleChange('gcpRegion', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Vertex AI Model Endpoint URL (Optional)
              </label>
              <input
                type="text"
                placeholder="https://us-central1-aiplatform.googleapis.com/v1/projects/.../endpoints/..."
                value={settings.vertexAiEndpoint}
                onChange={(e) => handleChange('vertexAiEndpoint', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5">
              <div>
                <div className="text-xs font-semibold text-white">
                  Local Synthetic Booster Fallback
                </div>
                <div className="text-[11px] text-zinc-400">
                  Automatically generates 30m forecasts if Cloud Vertex AI is cold-starting
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.useVertexAiSimulatedFallback}
                onChange={(e) => handleChange('useVertexAiSimulatedFallback', e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: External Transit & Weather Scrapers */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CloudRain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transit & Weather Feeds</h3>
              <p className="text-[11px] text-zinc-400">
                Airport flight schedules and precipitation surge factors
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Flight Stats / Aviation API Key
              </label>
              <input
                type="password"
                placeholder="aviationstack-key-..."
                value={settings.flightStatsApiKey}
                onChange={(e) => handleChange('flightStatsApiKey', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                OpenWeatherMap API Key
              </label>
              <input
                type="password"
                placeholder="weather-key-..."
                value={settings.weatherApiKey}
                onChange={(e) => handleChange('weatherApiKey', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Rideshare Partner Credentials */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Platform Partner Credentials</h3>
              <p className="text-[11px] text-zinc-400">
                Live demand connectors for Uber Driver, DiDi Driver, and inDrive
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                Uber Driver Client ID
              </label>
              <input
                type="text"
                placeholder="uber-client-..."
                value={settings.uberPartnerClientId}
                onChange={(e) => handleChange('uberPartnerClientId', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                DiDi Driver Token
              </label>
              <input
                type="text"
                placeholder="didi-token-..."
                value={settings.didiPartnerClientId}
                onChange={(e) => handleChange('didiPartnerClientId', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-400 mb-1">
                inDrive Partner Key
              </label>
              <input
                type="text"
                placeholder="indrive-key-..."
                value={settings.inDrivePartnerClientId}
                onChange={(e) => handleChange('inDrivePartnerClientId', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Driver HUD & Operational Preferences */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Driver HUD & Optimization Preferences</h3>
              <p className="text-[11px] text-zinc-400">
                Spatial resolution, alerts, GPS navigation app, and edge polling
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Preferred Navigation GPS
              </label>
              <select
                value={settings.navigationApp}
                onChange={(e) => handleChange('navigationApp', e.target.value)}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="google">Google Maps</option>
                <option value="waze">Waze</option>
                <option value="apple">Apple Maps</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Minimum Alert Surge Threshold
              </label>
              <select
                value={settings.minSurgeThreshold}
                onChange={(e) => handleChange('minSurgeThreshold', parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={1.2}>1.20x (Moderate Demand)</option>
                <option value={1.5}>1.50x (High Surge)</option>
                <option value={1.8}>1.80x (Very High Surge)</option>
                <option value={2.0}>2.00x (Extreme Surge Only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Auto-Refresh Edge Polling
              </label>
              <select
                value={settings.autoRefreshIntervalSeconds}
                onChange={(e) => handleChange('autoRefreshIntervalSeconds', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={15}>Every 15 seconds (Edge Cache Limit)</option>
                <option value={30}>Every 30 seconds (Balanced)</option>
                <option value={60}>Every 60 seconds (Battery Saver)</option>
                <option value={0}>Manual Only (Realtime Supabase Events)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Uber H3 Spatial Indexing Grid
              </label>
              <input
                type="text"
                disabled
                value="Resolution 8 (~0.7 km² / 460m Edge)"
                className="w-full px-3 py-2 bg-black/20 border border-white/5 rounded-xl text-xs text-zinc-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 6: Backup, Restore & Reset */}
        <div className="bg-[#131a29] border border-white/10 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 rounded-lg bg-[#1e2a42] hover:bg-[#253554] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-[#1e2a42] hover:bg-[#253554] text-zinc-300 text-xs font-medium flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs font-medium flex items-center gap-1.5 border border-red-500/30 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
