// Cloud word library for Paadal.
// GET  /api/words          -> [{cur, neu, lang, learned, ts}, ...]
// POST /api/words {ops:[{op:"set", entry}, {op:"del", key}]} -> updated list
// Optional: set environment variable PAADAL_KEY in Netlify; the app must then send the same value as header x-paadal-key to save.
import { getStore } from "@netlify/blobs";

export const keyOf = (e) => `${e.lang}|${String(e.cur).toLowerCase()}`;
const LANGS = new Set(["tamil", "english", "both"]);

export function applyOps(map, ops) {
  for (const o of Array.isArray(ops) ? ops.slice(0, 500) : []) {
    if (o && o.op === "set" && o.entry && typeof o.entry.cur === "string" && o.entry.cur.trim()) {
      const e = {
        cur: o.entry.cur.trim().slice(0, 200),
        neu: String(o.entry.neu ?? "").trim().slice(0, 200),
        lang: LANGS.has(o.entry.lang) ? o.entry.lang : "both",
        learned: !!o.entry.learned,
        ts: Date.now(),
      };
      map[keyOf(e)] = e;
    } else if (o && o.op === "del" && typeof o.key === "string") {
      delete map[o.key.toLowerCase().replace(/^([^|]*)\|/, (m, l) => l + "|")];
      delete map[o.key];
    }
  }
  return map;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  const store = getStore("paadal");
  const read = async () => (await store.get("words", { type: "json" })) || {};
  if (req.method === "GET") return json(Object.values(await read()));
  if (req.method === "POST") {
    const need = process.env.PAADAL_KEY;
    if (need && req.headers.get("x-paadal-key") !== need) return json({ error: "wrong sync password" }, 401);
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad JSON" }, 400); }
    const map = applyOps(await read(), body.ops);
    await store.setJSON("words", map);
    return json(Object.values(map));
  }
  return json({ error: "method not allowed" }, 405);
};

export const config = { path: "/api/words" };
