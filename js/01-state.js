// ===== the pattern being made, its pictures, saving, undo.
// PS = the work: the tile is W × W units (W = 1000); every piece is drawn on it and, where it runs over an edge, comes back on the other side
// (02-render OFFS). A piece: {id, img (a picture key in IMG), x, y (its centre, tile units), s (its width), ar (height / width), r (degrees),
// fx (flipped), text? / col? (a text piece — its picture is made from them, 04-ui)}.
// Pictures: IMG key → {src (data URL), el (Image)} · "st:<name>" = the built-in stickers (not saved), "u:<id>" = added ones, "t:<id>" = text.
// Saved in IndexedDB "mjpattern" / kv: "work" = {bg, rep, base, photo, items, strokes} · "img:<key>" = a picture's data URL. Undo = whole copies of the work.
const W = 1000;
const PS = { bg: "#FFF7F0", rep: "grid", items: [], sel: null, mode: "place", base: null, strokes: [], photo: null };   // base = ▦ ready-made (06) · strokes = ✏️ (07) · photo = 🖼️ (08)
const IMG = new Map();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------------------------------------------------------------- pictures
function imgAdd(key, src) {
    let e = IMG.get(key);
    if (e && e.src === src) return e;
    const el = new Image(); el.decoding = "async";
    e = { src, el, ready: new Promise(r => { el.onload = el.onerror = () => r(); }) };
    el.src = src; IMG.set(key, e);
    e.ready.then(() => typeof psDraw === "function" && psDraw());
    return e;
}
// a picture file → a data URL (shrunk to ≤ max px — 1600 is enough for a 4096 export of a piece a third of the tile; the 🖼️ photo keeps 3000)
function imgFromFile(file, max = 1600) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file), im = new Image();
        im.onload = () => {
            const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
            c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
            res({ src: c.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", .92), ar: c.height / c.width });
        };
        im.onerror = () => { URL.revokeObjectURL(url); rej(new Error("not a picture")); };
        im.src = url;
    });
}

// ---------------------------------------------------------------- saving (IndexedDB)
const DB = { db: null };
function dbOpen() {
    if (DB.db) return Promise.resolve(DB.db);
    return new Promise((res, rej) => {
        const q = indexedDB.open("mjpattern", 1);
        q.onupgradeneeded = () => q.result.createObjectStore("kv");
        q.onsuccess = () => res(DB.db = q.result); q.onerror = () => rej(q.error);
    });
}
async function dbGet(k) { const d = await dbOpen(); return new Promise(r => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); }
async function dbSet(k, v) { const d = await dbOpen(); return new Promise(r => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = t.onerror = () => r(); }); }
async function dbDel(k) { const d = await dbOpen(); return new Promise(r => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").delete(k); t.oncomplete = t.onerror = () => r(); }); }
async function dbKeys() { const d = await dbOpen(); return new Promise(r => { const q = d.transaction("kv").objectStore("kv").getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = () => r([]); }); }

const workJSON = () => JSON.stringify({ bg: PS.bg, rep: PS.rep, base: PS.base, photo: PS.photo, items: PS.items, strokes: PS.strokes });
const usedKeys = d => { const s = new Set(d.items.map(i => i.img)); if (d.photo) s.add(d.photo.img); return s; };
let saveT = 0;
function psSave() {   // (a moment after the last change) the work + any picture not saved yet; pictures nothing uses any more are dropped
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
        try {
            await dbSet("work", workJSON());
            const used = new Set([...usedKeys(PS)].filter(k => !k.startsWith("st:")));
            for (const k of used) if (!IMG.get(k)?.saved) { await dbSet("img:" + k, IMG.get(k).src); IMG.get(k).saved = true; }
            for (const k of await dbKeys()) if (k.startsWith("img:") && !used.has(k.slice(4)) && !UNDO.keys().has(k.slice(4))) dbDel(k);
        } catch (e) { console.warn(e); }
    }, 400);
}
async function psLoad() {
    try {
        const w = await dbGet("work"); if (!w) return false;
        const d = JSON.parse(w);
        d.items = d.items || [];
        for (const k of usedKeys(d)) if (!k.startsWith("st:") && !IMG.has(k)) { const src = await dbGet("img:" + k); if (src) { imgAdd(k, src).saved = true; } }
        PS.bg = d.bg ?? PS.bg; PS.rep = d.rep || "grid"; PS.base = d.base || null; PS.strokes = d.strokes || []; PS.photo = d.photo && IMG.has(d.photo.img) ? d.photo : null;
        PS.items = d.items.filter(it => IMG.has(it.img));
        return true;
    } catch (e) { console.warn(e); return false; }
}

// ---------------------------------------------------------------- undo / redo (whole copies of the work, 60 steps)
const UNDO = {
    past: [], future: [], cur: null,
    keys() { const s = new Set(); for (const j of [...this.past, ...this.future]) for (const k of usedKeys(JSON.parse(j))) s.add(k); return s; },
};
function psCommit() {   // call after a change is finished (a drag's end, a button)
    const now = workJSON(); if (now === UNDO.cur) return;
    if (UNDO.cur != null) { UNDO.past.push(UNDO.cur); if (UNDO.past.length > 60) UNDO.past.shift(); }
    UNDO.cur = now; UNDO.future = [];
    psSave(); psChanged();
}
function psRestore(j) { const d = JSON.parse(j); PS.bg = d.bg; PS.rep = d.rep; PS.base = d.base || null; PS.strokes = d.strokes || []; PS.photo = d.photo || null; PS.items = d.items; if (!PS.items.some(i => i.id === PS.sel)) PS.sel = null; UNDO.cur = j; psSave(); psChanged(); }
function psUndo() { if (!UNDO.past.length) return; UNDO.future.push(UNDO.cur); psRestore(UNDO.past.pop()); }
function psRedo() { if (!UNDO.future.length) return; UNDO.past.push(UNDO.cur); psRestore(UNDO.future.pop()); }
// (04-ui fills this in: the panels follow the work)
let psChanged = () => {};
const selItem = () => PS.items.find(i => i.id === PS.sel) || null;
