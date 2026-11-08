export interface AppSettings {
  // Supabase PostGIS
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;

  // Google Vertex AI & Cloud
  gcpProjectId: string;
  gcpRegion: string;
  vertexAiEndpoint: string;
  useVertexAiSimulatedFallback: boolean;

  // External Transit & Weather Feeds
  flightStatsApiKey: string;
  weatherApiKey: string;

  // Platform Partner Credentials
  uberPartnerClientId: string;
  didiPartnerClientId: string;
  inDrivePartnerClientId: string;

  // Driver Optimization Parameters
  defaultRadiusKm: number;
  minSurgeThreshold: number; // e.g. 1.5x
  navigationApp: 'google' | 'waze' | 'apple';
  autoRefreshIntervalSeconds: number; // 0 for manual, or 15, 30, 60
  h3Resolution: number; // default 8
}

export const DEFAULT_SETTINGS: AppSettings = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: '',

  gcpProjectId: 'rideshare-profit-prod',
  gcpRegion: 'us-central1',
  vertexAiEndpoint: '',
  useVertexAiSimulatedFallback: true,

  flightStatsApiKey: '',
  weatherApiKey: '',

  uberPartnerClientId: '',
  didiPartnerClientId: '',
  inDrivePartnerClientId: '',

  defaultRadiusKm: 5,
  minSurgeThreshold: 1.5,
  navigationApp: 'google',
  autoRefreshIntervalSeconds: 30,
  h3Resolution: 8,
};

const STORAGE_KEY = 'surgepilot_app_settings';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      supabaseUrl: parsed.supabaseUrl || DEFAULT_SETTINGS.supabaseUrl,
      supabaseAnonKey: parsed.supabaseAnonKey || DEFAULT_SETTINGS.supabaseAnonKey,
    };
  } catch (e) {
    console.error('Failed to load settings from localStorage:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Dispatch custom event for reactive updates across the app
    window.dispatchEvent(new CustomEvent('surgepilot_settings_changed', { detail: settings }));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}
