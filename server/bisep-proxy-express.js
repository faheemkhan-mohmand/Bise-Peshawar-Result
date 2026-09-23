// ─────────────────────────────────────────────────────────────────────────────
// Standalone Express host for the SAME bisep-proxy handler that Vercel runs.
//
// Use this when your static site lives on cPanel / Apache / NGINX (the zip's
// .htaccess / nginx-bisep.conf setups) and you cannot run Vercel serverless
// functions there. Run this on any Node 18+ box, then point the site at it:
//
//   1. npm install
//   2. PORT=8787 node server/bisep-proxy-express.js
//   3. In index.html set:  var BISEP_PROXY_BASE = "https://your-node-host:8787";
//      (the API is served with permissive CORS, exactly like the Vercel one)
//
// The handler is imported UNCHANGED from api/bisep-proxy.js — Express's
// res.status().json() / req.query surface matches the Vercel signature, so
// there is zero behavioural difference between the two deployments.
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import handler from "../api/bisep-proxy.js";

const app = express();
const PORT = process.env.PORT || 8787;

// Enable compression-free JSON responses + trust proxy for edge caches
app.set("trust proxy", true);
app.disable("x-powered-by");

// Same health-check shape as Vercel's root (harmless, useful for uptime pings)
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "bisep-proxy (standalone express)",
    usage: "?mode=current or ?roll=<number>",
  });
});

// The proxy — identical contract to Vercel: /api/bisep-proxy
app.all("/api/bisep-proxy", handler);

// 404 for everything else
app.use((_req, res) => {
  res.status(404).json({ ok: false, found: false, error: "Not found." });
});

app.listen(PORT, () => {
  console.log("[bisep-proxy] standalone listening on :" + PORT);
  console.log("[bisep-proxy] endpoint: http://localhost:" + PORT + "/api/bisep-proxy?mode=current");
});
