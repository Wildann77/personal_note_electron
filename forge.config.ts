process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'PersonalNote',
    executableName: 'personal-note',
    icon: './assets/icons/icon',
    osxSign: process.env.APPLE_CERTIFICATE ? {} : undefined,
    osxNotarize:
      process.env.APPLE_ID && process.env.APPLE_PASSWORD && process.env.APPLE_TEAM_ID
        ? {
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          }
        : undefined,
    ignore: (file: string) => {
      if (!file || file === '/') return false;
      return (
        !file.startsWith('/.vite') && !file.startsWith('/node_modules') && file !== '/package.json'
      );
    },
  },
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
  makers: [
    new MakerSquirrel({ setupIcon: './assets/icons/icon.ico' }),
    new MakerZIP({}, ['darwin', 'win32', 'linux']),
    new MakerDMG({ icon: './assets/icons/icon.icns' }),
    new MakerDeb({ options: { icon: './assets/icons/icon.png', categories: ['Utility'] } }),
    new MakerRpm({ options: { icon: './assets/icons/icon.png', categories: ['Utility'] } }),
  ],
};

export default config;
