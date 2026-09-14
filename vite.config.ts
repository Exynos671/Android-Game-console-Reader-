import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

// ---------------------------------------------------------------------------
// Legacy WebView colour fallback.
//
// Tailwind CSS v4 emits its palette with `oklch()` and applies opacity with
// `color-mix(in oklab, …)`. Both only exist in Chrome 111+. Android handhelds
// such as the Konkr Pocket Advance still ship Chrome 110 (WebView
// 110.0.5481), where those declarations are dropped: backgrounds become
// transparent and text falls back to black. This plugin rewrites the built CSS
// to plain `rgb()` / `rgba()`.
// ---------------------------------------------------------------------------
function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const rl = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (x: number) => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return [
    Math.round(gamma(rl) * 255),
    Math.round(gamma(gl) * 255),
    Math.round(gamma(bl) * 255),
  ];
}

function rewriteModernColors(css: string): string {
  // 1) oklch(...) -> rgb(r g b)
  let out = css.replace(
    /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/g,
    (_m, l, c, h) => {
      const [r, g, b] = oklchToRgb(parseFloat(l) / 100, parseFloat(c), parseFloat(h));
      return `rgb(${r} ${g} ${b})`;
    }
  );

  // 2) Build a name -> {r,g,b} map from the (now rgb) colour variables.
  const varMap: Record<string, [number, number, number]> = {};
  const varRe = /--color-([\w-]+)\s*:\s*(rgb\([^)]*\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*;/g;
  let vm: RegExpExecArray | null;
  while ((vm = varRe.exec(out))) {
    const parsed = parseColor(vm[2]);
    if (parsed) varMap[vm[1]] = [parsed.r, parsed.g, parsed.b];
  }

  // 3) Resolve (possibly nested) color-mix(in oklab, X P%, transparent).
  const resolve = (token: string): { r: number; g: number; b: number; a: number } | null => {
    const t = token.trim();
    if (t.startsWith('var(')) {
      const name = t.slice(4, -1).trim().replace(/^--color-/, '');
      const rgb = varMap[name];
      return rgb ? { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 } : null;
    }
    return parseColor(t);
  };

  const mixRe =
    /color-mix\(in oklab,\s*(var\(--color-[\w-]+\)|rgb\([^)]*\)|rgba\([^)]*\)|#[0-9a-fA-F]{3,8})\s*([\d.]+)%,\s*transparent\)/g;
  let prev = '';
  while (prev !== out) {
    prev = out;
    out = out.replace(mixRe, (_m, token, pct) => {
      const c = resolve(token);
      if (!c) return _m;
      const a = Math.round(c.a * (parseFloat(pct) / 100) * 1000) / 1000;
      return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;
    });
  }
  return out;
}

function parseColor(
  value: string
): { r: number; g: number; b: number; a: number } | null {
  const v = value.trim();
  let m = /^rgb\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: 1 };
  m = /^rgba\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
  m = /^#([0-9a-fA-F]{6})$/.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  m = /^#([0-9a-fA-F]{3})$/.exec(v);
  if (m) {
    const [r, g, b] = m[1].split('');
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
      a: 1,
    };
  }
  return null;
}

function legacyColorFallbackPlugin(): Plugin {
  return {
    name: 'handheld-legacy-color-fallback',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type === 'asset' && typeof file.fileName === 'string' && file.fileName.endsWith('.css')) {
            const source =
              typeof file.source === 'string'
                ? file.source
                : Buffer.from(file.source as Uint8Array).toString('utf8');
            const rewritten = rewriteModernColors(source);
            file.source = rewritten;
          }
        }
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      aistudioMediaPlugin(),
      legacyColorFallbackPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: '掌上阅读器 Handheld Reader',
          short_name: 'HH Reader',
          description: '为安卓掌机优化的电子书阅读器，支持 EPUB/MOBI 重排、手柄翻页与沉浸模式。An e-reader for Android handheld game consoles with EPUB/MOBI reflow, gamepad controls and immersive mode.',
          theme_color: '#090a0f',
          background_color: '#090a0f',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['books', 'entertainment'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
