import react from '@vitejs/plugin-react';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const appBase = process.env.VERCEL ? '/' : '/showroom/gameshell/';
const localDesignSystemRoot = fileURLToPath(
  new URL('../Joker-DS', import.meta.url),
);
const bundledDesignSystemRoot = fileURLToPath(
  new URL('./node_modules/@joker/design-system', import.meta.url),
);
const useLocalDesignSystem = existsSync(`${localDesignSystemRoot}/dist/index.js`);
const designSystemRoot = useLocalDesignSystem
  ? localDesignSystemRoot
  : bundledDesignSystemRoot;

function isDesignSystemRouletteImporter(importer) {
  return Boolean(
    importer &&
      (importer.includes('/Joker-DS/dist/components/RouletteWheel/') ||
        importer.includes('/@joker/design-system/dist/components/RouletteWheel/')),
  );
}

function repairIncompleteRouletteWheelBuild() {
  const wrapperReplacement = '\0joker:RouletteWrapper';
  const pathsReplacement = '\0joker:rouletteWheelPaths';
  const originalPaths = `${designSystemRoot}/dist/components/RouletteWheel/rouletteWheelPaths.js`;

  return {
    name: 'repair-incomplete-roulette-wheel-build',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        source === './RouletteWrapper' &&
        isDesignSystemRouletteImporter(importer)
      ) {
        return wrapperReplacement;
      }

      if (
        source === './rouletteWheelPaths' &&
        isDesignSystemRouletteImporter(importer)
      ) {
        return pathsReplacement;
      }

      return null;
    },
    load(id) {
      if (id === wrapperReplacement) {
        return `
          import React, {forwardRef} from 'react';

          export const RouletteWrapper = forwardRef(function RouletteWrapper(
            {children, className, ...props},
            ref,
          ) {
            const classes = ['joker-roulette-wrapper', className].filter(Boolean).join(' ');
            return React.createElement(
              'div',
              {...props, ref, className: classes, 'data-roulette-wrapper': ''},
              React.createElement(
                'div',
                {className: 'joker-roulette-wrapper__wheel-slot'},
                children,
              ),
            );
          });
        `;
      }

      if (id === pathsReplacement) {
        return `
          export * from ${JSON.stringify(originalPaths)};
          export const ROULETTE_WHEEL_NATIVE_WIDTH = 1111;
          export const ROULETTE_WHEEL_NATIVE_HEIGHT = 1162;
        `;
      }

      return null;
    },
  };
}

function overrideDesignSystemNavigationData() {
  const overridePath = fileURLToPath(
    new URL('./src/data/shellNavigationData.js', import.meta.url),
  );

  return {
    name: 'original-games-nav-without-4d-mines',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        source.endsWith('/data/navigationData.js') &&
        (importer?.includes('/Joker-DS/') ||
          importer?.includes('/@joker/design-system/'))
      ) {
        return overridePath;
      }

      return null;
    },
  };
}

function bundleDesignSystemSoundAssets() {
  return {
    name: 'bundle-design-system-sound-assets',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/dist/utils/designSystemSoundAssets.js')) {
        return null;
      }

      // Vite can only bundle `new URL()` assets when its first argument is a
      // literal. The design-system helper hides that literal behind a function,
      // leaving production chunks to resolve ../../assets at runtime.
      return code.replace(
        /designSystemSoundUrl\((['"])(\.\.\/\.\.\/assets\/[^'"]+)\1\)/g,
        'new URL($1$2$1, import.meta.url).href',
      );
    },
  };
}

function redirectMissingBaseSlash() {
  const baseWithoutSlash = appBase.replace(/\/$/, '');

  return {
    name: 'redirect-missing-base-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        const query = req.url?.includes('?')
          ? req.url.slice(req.url.indexOf('?'))
          : '';

        if (url === '/' || url === '') {
          res.writeHead(301, { Location: `${appBase}${query}` });
          res.end();
          return;
        }

        if (url === baseWithoutSlash) {
          res.writeHead(301, {Location: `${appBase}${query}`});
          res.end();
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    overrideDesignSystemNavigationData(),
    bundleDesignSystemSoundAssets(),
    repairIncompleteRouletteWheelBuild(),
    redirectMissingBaseSlash(),
  ],
  base: appBase,
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    server: {
      deps: {
        inline: ['@joker/design-system'],
      },
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['!**/Joker-DS/**'],
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['@joker/design-system'],
  },
  resolve: {
    alias: [
      ...(useLocalDesignSystem
        ? [
            {
              find: '@joker/design-system/styles.css',
              replacement: `${designSystemRoot}/src/styles/index.css`,
            },
            {
              find: /^@joker\/design-system\/styles\/(.+)$/,
              replacement: `${designSystemRoot}/src/styles/$1`,
            },
            {
              find: '@joker/design-system',
              replacement: `${designSystemRoot}/dist/index.js`,
            },
            {
              find: '../EnterBetPrecursor/index.js',
              replacement: `${designSystemRoot}/dist/components/EnterBetPrecursor/index.js`,
            },
          ]
        : []),
      {
        find: `${designSystemRoot}/dist/data/navigationData.js`,
        replacement: fileURLToPath(
          new URL('./src/data/shellNavigationData.js', import.meta.url),
        ),
      },
    ],
  },
});
