import react from '@vitejs/plugin-react';
import {existsSync, realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const appBase = process.env.VERCEL ? '/' : '/showroom/gameshell/';
const localDesignSystemRoot = fileURLToPath(
  new URL('../Joker-DS', import.meta.url),
);
const bundledDesignSystemRoot = fileURLToPath(
  new URL('./node_modules/@joker/design-system', import.meta.url),
);
const useLocalDesignSystem =
  !process.env.VERCEL && existsSync(`${localDesignSystemRoot}/dist/index.js`);
const designSystemRoot = useLocalDesignSystem
  ? realpathSync(localDesignSystemRoot)
  : bundledDesignSystemRoot;

function isDesignSystemRouletteImporter(importer) {
  return Boolean(
    importer &&
      (importer.includes('/Joker-DS/dist/components/RouletteWheel/') ||
        importer.includes('/@joker/design-system/dist/components/RouletteWheel/')),
  );
}

function preferLocalDesignSystem() {
  if (!useLocalDesignSystem) {
    return null;
  }

  return {
    name: 'prefer-local-design-system',
    enforce: 'pre',
    resolveId(source) {
      if (source === '@joker/design-system') {
        return `${designSystemRoot}/dist/index.js`;
      }

      if (source.startsWith('@joker/design-system/styles/')) {
        return `${designSystemRoot}/src/styles/${source.slice('@joker/design-system/styles/'.length)}`;
      }

      if (source === '@joker/design-system/styles.css') {
        return `${designSystemRoot}/src/styles/index.css`;
      }

      if (source.startsWith('@joker/design-system/')) {
        return `${designSystemRoot}/dist/${source.slice('@joker/design-system/'.length)}`;
      }

      return null;
    },
  };
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

function bundleDesignSystemSoundAssets() {
  return {
    name: 'bundle-design-system-sound-assets',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/dist/utils/designSystemSoundAssets.js')) {
        return null;
      }

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
    preferLocalDesignSystem(),
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
      allow: ['..', designSystemRoot],
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
    ],
  },
});
