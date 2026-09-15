process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'PersonalNote',
    executableName: 'personal-note',
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
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin', 'win32', 'linux']),
    new MakerDeb({ options: { categories: ['Utility'] } }),
    new MakerRpm({ options: { categories: ['Utility'] } }),
  ],
};

export default config;
