# BISE Peshawar Online Results System — Deployment Guide (v2)

This build upgrades the single-page site with the **exact same live BISE Peshawar
engine that the GHS Babi Khel website uses** (learned from `Results.tsx` +
`bisep-proxy.js` v5 "board-rejection-proof"):

- Live **exam title** fetched straight from cloud.bisep.edu.pk (`?mode=current`)
- Big **red countdown** ("TIME REMAINING" + ticking alarm clock) that HIDES the
  search form until the board announces, then flips to the search automatically
- Green **"BISE Peshawar result is LIVE"** pill
- **Roll number search** through the warmed board session
  (`PHPSESSID + ResultToken + X-Requested-With` over HTTP/2, 5 spaced retries,
  relay chain, last-good cache — the full v5 flow, unchanged)
- **Student Result Details card** — Candidate Information + Subject Wise Marks
  (Theory/Practical, HSSC/SSC fixed maximums, fail cells red, thin progress bars)
- **Share** (PNG card → WhatsApp/OS share sheet with your site link in the
  caption), **Save** (PNG download), **Compare** (two roll numbers, side by side,
  winner badge, subject table + chart, shareable comparison card)
- **Celebration** — gold confetti + chime on pass, calm teal drift on fail,
  "Replay the reveal" chip (respects reduced-motion)
- **24-hour on-device result cache** + automatic "Board busy — retrying (1/2)…"
  spaced retries (survives the board's probabilistic 403 rejections)

---

## 1. Files added in this build

| File | Purpose |
|------|---------|
| `api/bisep-proxy.js` | The GHS Babi Khel v5 serverless proxy, copied UNCHANGED. Runs on Vercel as `/api/bisep-proxy`. |
| `api/` (folder) | Vercel serverless functions folder — deploy the whole folder with the site. |
| `server/bisep-proxy-express.js` | Optional standalone Express host of the SAME handler for cPanel/Node hosting. |
| `package.json` | `"type": "module"` (required by the proxy) + express dependency for the standalone option. |
| `vercel.json` | Function duration (15s) + cache/security headers. |
| `README-DEPLOY.md` | This guide. |

`index.html` now contains the full live engine; the old demonstration database
is gone — the site fetches **real** BISE Peshawar results.

## 2. Deploy on Vercel (recommended — same-origin, zero config)

1. Push this folder to a Git repo, or use the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel            # from inside this folder
   vercel --prod
   ```
   (Drag-and-drop on vercel.com → "Deploy" also works: zip WITHOUT the
   folder nesting, or import the repo.)
2. That's it. The site is served from `/` and the proxy runs at
   `/api/bisep-proxy` **on the same domain**, so `connect-src 'self'` is
   already enough. Test:
   ```
   https://your-app.vercel.app/api/bisep-proxy?mode=current
   https://your-app.vercel.app/api/bisep-proxy?roll=703902
   ```

## 3. Static host (cPanel / Apache / NGINX) + proxy elsewhere

If your static host cannot run Node serverless functions:

1. Deploy `api/` + `package.json` + `vercel.json` to a Vercel project
   (only the API matters there).
2. Point the static site at it — in `index.html`, top of the script:
   ```js
   var BISEP_PROXY_BASE = "https://your-app.vercel.app";   // no trailing slash
   ```
   Leave it as `""` when the proxy is same-origin.
3. CSP: the shipped `connect-src 'self' https:` already allows any HTTPS API
   host. To harden further, replace `https:` with your exact Vercel origin in
   `.htaccess`, `nginx-bisep.conf` and the in-page `<meta>` CSP.

## 4. Standalone Node host (no Vercel at all)

```bash
npm install
PORT=8787 node server/bisep-proxy-express.js
```
Then set `BISEP_PROXY_BASE = "http://your-node-box:8787"` in `index.html`.
CORS is already permissive on this endpoint (same as Vercel's).

## 5. Environment test hooks (from the GHS build, still available)

- `BISEP_TEST_CURRENT_HTML=<file>` — serve a fixture homepage instead of the
  live board (parser tests).
- `BISEP_TEST_ROLL_HTML=<file>` — serve a fixture marksheet.
- `BISEP_DISABLE_H2=1` / `BISEP_DISABLE_RELAYS=1` / `BISEP_FORCE_UPSTREAM=1` /
  `BISEP_NO_MEMCACHE=1` — debugging switches.

## 6. Operational notes (carried over from GHS Babi Khel — important)

- The board **probabilistically rejects ~40–60% of lookups** with 403
  "Invalid request." on result day. The v5 proxy already handles this with
  5 spaced retries; the page adds its own two spaced retries plus a 24h
  device cache. **Do not "simplify" these retries out.**
- Marksheets are FINAL once published — found results are cached 6h in the
  function memory and 30 min on the edge. This is what keeps the board alive.
- While a countdown is active the site does NOT call `?roll=` at all — it
  short-circuits with the official announcement time, exactly like GHS.
- The countdown/search flip is polled adaptively (every 1s inside the final
  minute, otherwise every 15s), so results appear without a page refresh.

## 7. Verify the deployment

1. Open the site → title should show the live board title (or the fallback
   while the board is unreachable).
2. Pre-announcement: search form is replaced by the red countdown card.
3. After announcement: green LIVE pill + roll search; search a real roll.
4. Share → PNG card + caption with your site link; Save → PNG download;
   Compare → two rolls side by side.

## 8. Google Search Console + AI visibility (v3 build)

This build is fully open to Google, Bing and AI crawlers (GPTBot,
OAI-SearchBot/ChatGPT, ClaudeBot, PerplexityBot, Google-Extended, Applebot,
CCBot, Meta, Amazonbot, and more) — via robots.txt + `X-Robots-Tag: index,
follow` headers + a new **/llms.txt** file written for AI answer engines.

### 8.1 YES — submit the sitemap in Search Console

1. Google Search Console → (select your property) → **Sitemaps** (left menu).
2. Enter exactly:  `sitemap.xml`  → click **Submit**.
   (Full URL form also works: `https://cloud.bisep.edu.pk/sitemap.xml`.)
3. Status will say "Success" once Google re-fetches — can take a few minutes
   to a few days; "Couldn't fetch" right after submitting is normal and often
   clears on its own. Re-submit after 24–48h if needed.

### 8.2 Verify the site (fastest methods first)

| Method | How | Speed |
|--------|-----|-------|
| **DNS TXT record** (Domain property) | GSC → Add property → `bisep.edu.pk` (or `cloud.bisep.edu.pk`) → copy the `google-site-verification=...` TXT → paste in your DNS provider → Verify | ~minutes |
| **HTML file** (URL-prefix property) | GSC gives you `google1234abcd.html` → upload it into this site root folder → deploy → Verify | ~minutes |
| **HTML meta tag** | GSC gives you `<meta name="google-site-verification" content="...">` → paste into `index.html` right after the `<title>` tag → deploy → Verify | ~minutes |

The HTML-file method works on this build as-is (Vercel serves it with 200;
Apache serves it with 200 because the file physically exists).

### 8.3 ⚠️ If Google "can't fetch" the site or sitemap — checklist

These are the causes that block Google even when robots.txt is perfect:

1. **Vercel Deployment Protection** (the #1 cause on Vercel):
   Vercel Dashboard → your project → **Settings → Deployment Protection** →
   set **"Vercel Authentication" = Disabled** (or Standard) so production is
   public. If enabled, Googlebot gets a login page and GSC shows
   "Couldn't fetch".
2. **Vercel Attack Challenge Mode**: Dashboard → project → **Settings →
   Security** → make sure **Attack Challenge Mode is OFF** (it challenges
   every visitor INCLUDING Googlebot).
3. **Custom domain assigned**: GSC property must be the real domain
   (`cloud.bisep.edu.pk`), not the temporary `*.vercel.app` preview URL.
   Dashboard → project → Settings → Domains → add & point the DNS.
4. **HTTPS + redirect**: `https://cloud.bisep.edu.pk/` must load with a valid
   padlock. GSC property should be the `https://` URL-prefix (or the Domain
   property which covers both).
5. **Live sanity checks after deploy** (paste in browser):
   - `https://cloud.bisep.edu.pk/robots.txt` → the new allow-all list
   - `https://cloud.bisep.edu.pk/sitemap.xml` → XML with 1 URL
   - `https://cloud.bisep.edu.pk/llms.txt` → the AI site description
   - All three must load without errors — then GSC fetches will succeed.
6. **Service worker (fixed in v3)**: the old SW cached `robots.txt` and
   `sitemap.xml`, which could serve stale copies to re-visitors and confuse
   re-fetch checks. v3 never caches `/robots.txt`, `/sitemap.xml`,
   `/llms.txt` or any sitemap — always fresh from the network.

### 8.4 After verification — get indexed fast

1. GSC → **URL Inspection** (top search bar) → enter
   `https://cloud.bisep.edu.pk/` → **Request Indexing**.
2. Submit the sitemap (step 8.1).
3. Add your link somewhere Google already crawls (e.g., the school website,
   social profile, or a directory) — first discovery speeds up a lot.
4. Note: the Sitemaps box only accepts XML — `llms.txt` is NOT submitted
   there; AI tools discover and read it automatically at its root URL.
5. Bing/ChatGPT: submit the same site at
   https://www.bing.com/webmasters (it also feeds ChatGPT search).

### 8.5 What changed in v3 (SEO/AI package)

| File | Change |
|------|--------|
| `robots.txt` | Rewritten: explicit Allow for Google (+Image/News/Video/Ads), Bing, DuckDuckGo, Yandex, Baidu + 20 AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, ClaudeBot/-User/-SearchBot, PerplexityBot/-User, Applebot(+Extended), CCBot, cohere-ai, DuckAssistBot, YouBot, Amazonbot, Meta bots, Bytespider, ImagesiftBot). Sitemap line kept. |
| `llms.txt` | NEW — machine-readable site summary for AI answer engines (what the site is, public API endpoints, facts). |
| `sitemap.xml` | Cleaned (no comments), lastmod bumped, valid XML, absolute https URL. |
| `sw.js` | robots.txt/sitemap.xml removed from precache; SEO files now always network-fresh; cache version bumped to `bisep-cloud-v3`. |
| `vercel.json` | Added `X-Robots-Tag: index, follow…` header + no-cache for robots.txt/sitemap.xml/llms.txt. |
| `.htaccess` | Same X-Robots-Tag + no-cache for SEO files + explicit xml/txt MIME types. |
| `nginx-bisep.conf` | Same X-Robots-Tag + no-cache/fresh locations for the three SEO files. |
