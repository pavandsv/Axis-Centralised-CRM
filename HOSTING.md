# Hosting the Axis Finance CRM POC

It is a **static single-page app** — no backend, no database, no server runtime.
`npm run build` produces `dist/`, and `dist/` is the entire deployable.

```bash
npm install        # once
npm run build      # -> dist/
npm run preview    # serve the production build locally on :4173
```

## The only two things that can go wrong

1. **Deep links must rewrite to `index.html`.** The router lives in JavaScript, so
   `/dashboard` is not a file. Without a rewrite rule, a refresh on any page
   returns 404. Config for this is already committed: `netlify.toml`,
   `vercel.json`, and `public/_redirects` (which ends up in `dist/`). On other
   hosts you must add the equivalent yourself — see the snippets below.
2. **Compression must be on.** The bundle is 3.8 MB raw but **578 KB gzipped**,
   because it carries the full 1,500-lead dataset. Every managed host does this
   automatically; a bare Nginx/Apache/IIS may not.

## Option A — the host the current mockup already uses

The existing mockup is served from `axis-crm-retail.onslate.com` as a plain Vite
build: `index.html` + `assets/` + the two PNGs. This build has the identical
shape, so it is a like-for-like replacement — upload the contents of `dist/` to
the same location and add the SPA rewrite. Lowest-friction option, and the client
already knows the URL.

## Option B — Netlify (fastest way to a fresh URL)

Drag the `dist/` folder onto https://app.netlify.com/drop — done, no account
needed for a temporary link. Or:

```bash
npx netlify-cli deploy --prod --dir=dist
```

`netlify.toml` already sets the rewrite and immutable caching on `/assets/*`.

## Option C — Vercel

```bash
npx vercel --prod
```

`vercel.json` already contains the rewrite.

## Option D — Cloudflare Pages

Connect the repo, or `npx wrangler pages deploy dist`. Build command
`npm run build`, output directory `dist`. Add a `_redirects` file — already
present in `public/`, so it ships automatically.

## Option E — your own Nginx / IIS

Nginx:

```nginx
server {
  root /var/www/axis-crm;
  gzip on;
  gzip_types text/css application/javascript;

  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri $uri/ /index.html; }   # the SPA rewrite
}
```

IIS — add to `web.config`:

```xml
<rewrite><rules><rule name="SPA" stopProcessing="true">
  <match url=".*" />
  <conditions logicalGrouping="MatchAll">
    <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
  </conditions>
  <action type="Rewrite" url="/index.html" />
</rule></rules></rewrite>
```

## Option F — in-room demo, no hosting at all

```bash
npm run build && npm run preview -- --host
```

Prints a LAN URL the client can open on their own laptop or phone over the same
Wi-Fi. Nothing leaves the machine.

## Hosting under a sub-path

If it will not live at the domain root (e.g. `example.com/axis-crm/`), set the
base in `vite.config.js` and rebuild, or routing and asset URLs will break:

```js
export default defineConfig({ base: '/axis-crm/', plugins: [react()] })
```

## Before you share the link

- There is **no authentication** — the login screen is a role picker. Anyone with
  the URL can open any of the 11 roles. Put it behind Netlify/Cloudflare
  password protection, or an IP allow-list, before it goes to a wider audience.
- All data is illustrative. State that on any client-facing link.
- Nothing persists: a refresh resets the demo to the seeded dataset.

## If first load feels slow

The 578 KB is almost entirely the seeded dataset. Two levers:

- Lower `leadCount` in `scripts/generate-dataset.mjs` and re-run it — 600 leads
  roughly halves the payload, at the cost of thinner per-DST numbers.
- Or split the lead timelines (820 KB, 26% of the lead payload) into their own
  module and load it only for the Audit screen and the lead detail drawer.

## Hosting under a sub-path

The build assumes it is served from the domain root (`https://host/`). Assets are
emitted as `/assets/…`, which 404s if the app lives at `https://host/axis-crm/`.
Two changes are needed together — one alone leaves either the assets or the
routes broken:

```js
// vite.config.js
export default defineConfig({ base: '/axis-crm/', plugins: [react()] })
```

```jsx
// src/App.jsx
<BrowserRouter basename="/axis-crm">
```

A relative `base: './'` is **not** a substitute: with client-side routing the
browser would resolve `assets/…` against `/axis-crm/leads`, not the app root.
