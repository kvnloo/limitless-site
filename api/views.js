// Page counter for the Limitless launch page.
// Stores ONE number (a running total) in a private Vercel Blob. No IPs, no cookies, no user agents, no IDs.
//   GET  /api/views  -> {"views": n}          (read only)
//   POST /api/views  -> {"views": n + 1}      (the page calls this once per browser session)
// Writes are conditional on the blob's ETag (ifMatch), so two visits at the same moment never overwrite
// each other: the loser re-reads and retries.
import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";

// previews count into their own file, so testing never touches the real total
const PATH = process.env.VERCEL_ENV === "production" ? "counter/views.json" : "counter/views-preview.json";
const ORIGINS = new Set(["https://limitless-hermes.vercel.app", "https://kvnloo.github.io"]);

async function read() {
  try {
    // useCache:false reads origin storage, never a CDN copy: the ETag we write against is always current
    const r = await get(PATH, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200) return { n: 0, etag: null };
    const text = await new Response(r.stream).text();
    const n = Number(JSON.parse(text).views);
    return { n: Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0, etag: r.blob.etag };
  } catch (e) {
    if (e instanceof BlobNotFoundError) return { n: 0, etag: null };
    throw e;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bump() {
  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt) await sleep(Math.min(800, 25 * 2 ** attempt) * (0.5 + Math.random()));  // jittered backoff
    const { n, etag } = await read();
    try {
      await put(PATH, JSON.stringify({ views: n + 1 }), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: etag !== null,
        cacheControlMaxAge: 60,
        ...(etag ? { ifMatch: etag } : {}),
      });
      return n + 1;
    } catch (e) {
      // someone else wrote first (ETag moved, or two visits both tried to create the blob): re-read, retry
      if (e instanceof BlobPreconditionFailedError || /already exists/i.test(String(e && e.message))) continue;
      throw e;
    }
  }
  throw new Error("counter busy");
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    return res.status(204).end();
  }
  try {
    if (req.method === "POST") {
      // count only visits from the launch page itself
      if (origin && !ORIGINS.has(origin)) return res.status(403).json({ error: "origin" });
      return res.status(200).json({ views: await bump() });
    }
    if (req.method === "GET") return res.status(200).json({ views: (await read()).n });
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method" });
  } catch {
    return res.status(503).json({ error: "unavailable" });
  }
}
