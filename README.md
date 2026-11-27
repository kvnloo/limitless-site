# Limitless launch site

The launch page and vision film for [Limitless](https://github.com/kvnloo/limitless), an open Hermes Agent
plugin for health and focus built on your own data.

Live: https://limitless-hermes.vercel.app/

- `index.html`, `style.css`, `site.js`: the page. No build step and no front-end dependencies; it respects
  `prefers-reduced-motion`.
- `media/`: the film (`limitless-vision-v1.mp4`) and its poster.
- `fonts/`: Instrument Serif, Instrument Sans and IBM Plex Mono, each under the SIL Open Font License
  (licence files alongside).
- `api/views.js`: the page counter, a Vercel function on a private Vercel Blob store. It keeps one running
  total: no cookies and no IP addresses. The page counts once per browser session.

Deploy with the Vercel CLI from this folder: `vercel deploy --prod`.

This folder was split out of `kvnloo/limitless` (`site/`) with its history, so plugin installs no longer
download the film. The old address, https://kvnloo.github.io/limitless/, redirects here.
