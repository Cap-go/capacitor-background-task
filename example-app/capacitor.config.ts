import type { CapacitorConfig } from '@capacitor/cli';

import pkg from './package.json';

const config: CapacitorConfig = {
  "appId": "app.capgo.backgroundtask.example",
  "appName": "Background Task Example",
  "webDir": "dist",
  "plugins": {
    "CapacitorUpdater": {
      "appId": "app.capgo.backgroundtask.example",
      "autoUpdate": true,
      "autoSplashscreen": true,
      "directUpdate": "always",
      "defaultChannel": "production",
      "version": pkg.version
    }
  }
};

export default config;
