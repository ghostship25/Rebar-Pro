import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build' as const,
  transformIndexHtml: (html: string) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'" />
    <meta name="referrer" content="no-referrer" />`
    ),
});

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_ACTIONS === 'true' ? '/Rebar-Pro/' : '/',
    plugins: [react(), tailwindcss(), cspPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
