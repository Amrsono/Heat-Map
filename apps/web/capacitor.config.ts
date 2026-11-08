import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.surgepilot.heatmap',
  appName: 'SurgePilot AI',
  webDir: 'public',
  server: {
    url: 'https://heat-map-rosy-six.vercel.app',
    cleartext: true
  }
};

export default config;
