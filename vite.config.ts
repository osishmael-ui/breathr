import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function normalizeSiteUrl(value: string | undefined) {
  const fallback = 'http://localhost:5173';
  if (!value) return fallback;
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/$/, '');
}

function seoAssets(): Plugin {
  const siteUrl = normalizeSiteUrl(process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL);

  return {
    name: 'breathr-seo-assets',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const transformedHtml = html.replaceAll('__SITE_URL__', siteUrl);
        if (!context.bundle) return transformedHtml;

        const tags = Object.values(context.bundle)
          .filter((output) => output.type === 'asset' && /(?:dm-sans-latin-400-normal|manrope-latin-500-normal).*\.woff2$/.test(output.fileName))
          .map((output) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `/${output.fileName}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          }));

        return { html: transformedHtml, tags };
      },
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${siteUrl}/</loc>`,
          '    <changefreq>monthly</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'llms.txt',
        source: [
          '# Breathr',
          '',
          '> A free, private breathing companion with calming 2ndBell soundtracks that works without an account.',
          '',
          'Breathr pairs three 2ndBell relaxation recordings with guided inhale, hold, exhale patterns; flexible countdown timers; open-ended playback; configurable Pomodoro cycles; completion cues; themes; keyboard shortcuts; offline PWA installation; and an optional screen wake lock.',
          '',
          '## Key facts',
          '',
          '- Free to use.',
          '- No account required.',
          '- Preferences and active sessions are stored locally in the user’s browser.',
          '- Audio plays locally; Breathr does not upload audio or session data.',
          '- Available as an installable progressive web app on supported browsers.',
          '',
          '## Links',
          '',
          `- [Use Breathr](${siteUrl}/): Start a breathing session.`,
          '- [Feedback](mailto:os@osishmael.com): Send product feedback.',
          '',
        ].join('\n'),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), seoAssets()],
});
