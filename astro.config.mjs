import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import partytown from "@astrojs/partytown";
import sitemap from '@astrojs/sitemap';
import { paraglide } from "@inlang/paraglide-js-adapter-vite";
import cloudflare from "@astrojs/cloudflare";
import solidJs from "@astrojs/solid-js";

import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    // All urls that don't contain `es` or `fr` after `https://stargazers.club/` will be treated as default locale, i.e. `en`
    locales: ['en', 'ja'],
    // All supported locales
    routing: {
      prefixDefaultLocale: false
    }
  },
  site: "https://rating-icon.pages.dev",
  integrations: [tailwind(), partytown({
    config: {
      forward: ["dataLayer.push"],
      resolveUrl: url => {
        if (url.hostname === "www.googletagmanager.com") {
          if ("https://www.googletagmanager.com/gtag/js?id=G-ZB1ZHFW237&l=dataLayer&cx=c" === url.href) {
            return url;
          }
          if ("https://www.googletagmanager.com/gtag/js?id=G-ZB1ZHFW237" === url.href) {
            return url;
          }
          if ("https://www.googletagmanager.com/gtm.js?id=GTM-WF44K9S9" === url.href) {
            return url;
          }
          const proxyUrl = new URL("https://rating-icon.pages.dev/api/proxy/proxy");
          proxyUrl.searchParams.append('url', url.href);
          console.log(url);
          return proxyUrl;
        }
        return url;
      }
      // debug: true,
    }
  }), sitemap({
    i18n: {
      defaultLocale: 'ja',
      // All urls that don't contain `es` or `fr` after `https://stargazers.club/` will be treated as default locale, i.e. `en`
      locales: {
        en: 'en-US',
        // The `defaultLocale` value must present in `locales` keys
        ja: 'ja-JP'
      }
    }
  }), solidJs(),
  compress({
    JavaScript: {
      terser: {
        compress: {
          typeofs: false
        }
      }
    }
  }),
  ],
  vite: {
    plugins: [paraglide({
      project: "./project.inlang",
      outdir: "./src/paraglide"
    }),
  ],
    build: {
      // minify: false,
      // 超えたらやめる
      // assetsInlineLimit: 0,
    }
  },
  output: "hybrid",
  // server: {
  //   headers: "Access-Control-Allow-Origin: https://www.googletagmanager.com"
  // },
  adapter: cloudflare({
    mode: "advanced",
    wasmModuleImports: true,
  }),
});
