// Song library backup for Paadal (lyrics + compact MP3 audio), stored in Netlify Blobs.
//   GET    /api/songs              -> [{ id, title, created, updated, source, yt, hasAudio, lineCount }]
//   GET    /api/songs/:id          -> full record { id, title, lines, enOver, source, yt, ... }
//   PUT    /api/songs/:id          -> save record (JSON)
//   GET    /api/songs/:id/audio    -> audio (audio/mpeg)
//   PUT    /api/songs/:id/audio    -> save audio (binary body, max ~6 MB)
//   DELETE /api/songs/:id          -> delete record + audio
// Writes need header x-paadal-key when the PAADAL_KEY environment variable is set.
import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const okId = (id) => /^[a-z0-9-]{4,40}$/i.test(id || "");

export function summarize(rec) {
  return {
    id: rec.id, title: String(rec.title || "Untitled").slice(0, 200), created: rec.created || Date.now(), updated: rec.updated || Date.now(),
    source: rec.source || "file", yt: rec.yt || null, hasAudio: !!rec.hasAudio,
    lineCount: Array.isArray(rec.lines) ? rec.lines.filter((l) => String(l).trim()).length : 0,
  };
}

export default async (req) => {
  const store = getStore("paadal-songs");
  const parts = new URL(req.url).pathname.replace(/\/+$/, "").split("/").filter(Boolean); // ["api","songs",id?,"audio"?]
  const id = parts[2], sub = parts[3];
  const readIndex = async () => (await store.get("index", { type: "json" })) || {};
  const isWrite = req.method !== "GET";
  if (isWrite) {
    const need = process.env.PAADAL_KEY;
    if (need && req.headers.get("x-paadal-key") !== need) return json({ error: "wrong sync password" }, 401);
  }
  if (!id) {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405);
    return json(Object.values(await readIndex()).sort((a, b) => b.updated - a.updated));
  }
  if (!okId(id)) return json({ error: "bad id" }, 400);

  if (sub === "audio") {
    if (req.method === "GET") {
      const buf = await store.get("audio/" + id, { type: "arrayBuffer" });
      return buf ? new Response(buf, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } }) : json({ error: "not found" }, 404);
    }
    if (req.method === "PUT") {
      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: "empty" }, 400);
      await store.set("audio/" + id, buf);
      const idx = await readIndex(); if (idx[id]) { idx[id].hasAudio = true; await store.setJSON("index", idx); }
      return json({ ok: true, bytes: buf.byteLength });
    }
    return json({ error: "method not allowed" }, 405);
  }

  if (req.method === "GET") {
    const rec = await store.get("song/" + id, { type: "json" });
    return rec ? json(rec) : json({ error: "not found" }, 404);
  }
  if (req.method === "PUT") {
    let rec; try { rec = await req.json(); } catch { return json({ error: "bad JSON" }, 400); }
    rec.id = id; rec.updated = rec.updated || Date.now();
    const idx = await readIndex();
    if (idx[id] && idx[id].hasAudio) rec.hasAudio = true;
    await store.setJSON("song/" + id, rec);
    idx[id] = summarize(rec); await store.setJSON("index", idx);
    return json(idx[id]);
  }
  if (req.method === "DELETE") {
    await store.delete("song/" + id); await store.delete("audio/" + id);
    const idx = await readIndex(); delete idx[id]; await store.setJSON("index", idx);
    return json({ ok: true });
  }
  return json({ error: "method not allowed" }, 405);
};

export const config = { path: ["/api/songs", "/api/songs/*"] };
