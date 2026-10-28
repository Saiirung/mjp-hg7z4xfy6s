// ===== drawing: the tile, the repeat unit, the mat (editor) and the preview.
// The tile = W × W, in layers: the ground colour · 🖼️ photo (08) · ▦ ready-made (06) · ✋ pieces · ✏️ strokes (07).
// The tile = W × W; a piece running over an edge is drawn again where that edge's neighbour tile would show it (OFFS — the neighbours' places
// for each arrangement), so the tile joins up. The repeat unit = the smallest picture that repeats side by side as it is:
//   grid W × W (the tile) · halfdrop 2W × W (the second column half a tile down) · brick W × 2W (the second row half a tile across) ·
//   mirror 2W × 2W (the tile, flipped across, down, both — no wrapping: the mirrored edges meet by themselves).
const OFFS = {
    grid: [[0, 0], [W, 0], [-W, 0], [0, W], [0, -W], [W, W], [W, -W], [-W, W], [-W, -W]],
    halfdrop: [[0, 0], [0, W], [0, -W], [W, W / 2], [W, -W / 2], [-W, W / 2], [-W, -W / 2], [W, 3 * W / 2], [W, -3 * W / 2], [-W, 3 * W / 2], [-W, -3 * W / 2]],
    brick: [[0, 0], [W, 0], [-W, 0], [W / 2, W], [-W / 2, W], [W / 2, -W], [-W / 2, -W], [3 * W / 2, W], [-3 * W / 2, W], [3 * W / 2, -W], [-3 * W / 2, -W]],
    mirror: [[0, 0]],
};
const UNIT = { grid: [1, 1], halfdrop: [2, 1], brick: [1, 2], mirror: [2, 2] };   // (in tiles)

function pieceR(it) { return Math.hypot(it.s, it.s * it.ar) / 2; }
function drawPiece(g, it, ox, oy, solid) {
    const e = IMG.get(it.img); if (!e || !e.el.complete || !e.el.naturalWidth) return;
    const w = it.s, h = it.s * it.ar;
    g.save(); g.translate(it.x + ox, it.y + oy); g.rotate(it.r * Math.PI / 180); if (it.fx) g.scale(-1, 1);
    g.drawImage(solid ? solidOf(e) : e.el, -w / 2, -h / 2, w, h); g.restore();
}
// (a picture as a white silhouette — the brush's "shape of the pattern" grain)
function solidOf(e) {
    if (e.solid) return e.solid;
    const c = document.createElement("canvas"); c.width = e.el.naturalWidth; c.height = e.el.naturalHeight;
    const g = c.getContext("2d"); g.drawImage(e.el, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    return e.solid = c;
}
// the tile onto g (g already scaled so 1 unit = 1 tile unit, origin at the tile's corner) — opts.bg false = see-through · opts.solid = white shapes
function drawTile(g, opts = {}) {
    g.save(); g.beginPath(); g.rect(0, 0, W, W); g.clip();
    if (opts.bg !== false && PS.bg) { g.fillStyle = PS.bg; g.fillRect(0, 0, W, W); }
    if (typeof drawPhoto === "function") drawPhoto(g, opts);   // (🖼️ the photo tile, 08-photo)
    if (typeof drawBase === "function") drawBase(g, opts.solid);   // (▦ the ready-made ground pattern, 06-ready)
    for (const it of PS.items) {
        const R = pieceR(it);
        for (const [ox, oy] of OFFS[PS.rep]) {
            const x = it.x + ox, y = it.y + oy;
            if (x + R < 0 || x - R > W || y + R < 0 || y - R > W) continue;
            drawPiece(g, it, ox, oy, opts.solid);
        }
    }
    if (typeof drawStrokes === "function") drawStrokes(g, opts);   // (✏️ the drawing, on top — 07-draw)
    g.restore();
}
function tileCanvas(px, opts) {
    const c = document.createElement("canvas"); c.width = c.height = Math.max(1, Math.round(px));
    const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.scale(c.width / W, c.width / W); drawTile(g, opts); return c;
}
// the repeat unit at px per tile, made from one drawn tile
function unitFrom(tile, rep = PS.rep) {
    const t = tile.width, [ux, uy] = UNIT[rep], c = document.createElement("canvas"); c.width = t * ux; c.height = t * uy;
    const g = c.getContext("2d");
    if (rep === "grid") g.drawImage(tile, 0, 0);
    else if (rep === "halfdrop") { g.drawImage(tile, 0, 0); g.drawImage(tile, t, -t / 2); g.drawImage(tile, t, t / 2); }
    else if (rep === "brick") { g.drawImage(tile, 0, 0); g.drawImage(tile, -t / 2, t); g.drawImage(tile, t / 2, t); }
    else { g.drawImage(tile, 0, 0); for (const [sx, sy] of [[-1, 1], [1, -1], [-1, -1]]) { g.save(); g.translate(sx < 0 ? 2 * t : 0, sy < 0 ? 2 * t : 0); g.scale(sx, sy); g.drawImage(tile, 0, 0); g.restore(); } }
    return c;
}
const unitCanvas = (px, opts) => unitFrom(tileCanvas(px, opts));
// a picture of the pattern repeated over w × h, tiles of px (the unit's top-left at ox, oy)
function fillWith(g, unit, w, h, ox = 0, oy = 0) {
    const p = g.createPattern(unit, "repeat"); p.setTransform(new DOMMatrix().translate(ox, oy));
    g.fillStyle = p; g.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------- the mat (editor) and the preview
const ED = { cv: null, g: null, T: 0, x0: 0, y0: 0, dpr: 1, raf: 0 };
function edLayout() {
    const cv = ED.cv, r = cv.getBoundingClientRect(), dpr = ED.dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ED.T = Math.round(Math.min(r.width, r.height) * .64); ED.x0 = Math.round((r.width - ED.T) / 2); ED.y0 = Math.round((r.height - ED.T) / 2);
    const pv = document.getElementById("pv"), pr = pv.getBoundingClientRect(); pv.width = Math.round(pr.width * dpr); pv.height = Math.round(pr.height * dpr);
}
function psDraw() { if (!ED.raf) ED.raf = requestAnimationFrame(() => { ED.raf = 0; edDraw(); pvDraw(); }); }
function edDraw() {
    const { cv, g, T, x0, y0, dpr } = ED; if (!g) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    const tile = tileCanvas(T * dpr); ED.tile = tile;
    // the neighbours, faint (where the pattern carries on) — then the tile itself
    g.globalAlpha = .32; fillWith(g, unitFrom(tile), cv.width, cv.height, x0 * dpr, y0 * dpr); g.globalAlpha = 1;
    g.save(); g.shadowColor = "rgba(150,60,90,.28)"; g.shadowBlur = 30 * dpr; g.shadowOffsetY = 10 * dpr;
    g.fillStyle = PS.bg || "#fff"; g.fillRect(x0 * dpr, y0 * dpr, T * dpr, T * dpr); g.restore();
    if (!PS.bg) { g.save(); g.fillStyle = g.createPattern(checker(), "repeat"); g.fillRect(x0 * dpr, y0 * dpr, T * dpr, T * dpr); g.restore(); }
    g.drawImage(tile, x0 * dpr, y0 * dpr);
    // the picked piece: its box (where it was picked — maybe a wrapped copy) + the round handle (size + turn)
    const it = selItem();
    if (it) {
        const k = T / W * dpr, [ox, oy] = PS.selOff || [0, 0], w = it.s * k, h = it.s * it.ar * k;
        g.save(); g.translate((x0 * dpr) + (it.x + ox) * k, (y0 * dpr) + (it.y + oy) * k); g.rotate(it.r * Math.PI / 180);
        g.setLineDash([6 * dpr, 5 * dpr]); g.lineWidth = 2 * dpr; g.strokeStyle = "#3E3A36"; g.strokeRect(-w / 2, -h / 2, w, h); g.setLineDash([]);
        g.beginPath(); g.arc(w / 2, h / 2, 11 * dpr, 0, 7); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2.5 * dpr; g.stroke();
        g.beginPath(); g.arc(w / 2, h / 2, 4 * dpr, 0, 7); g.fillStyle = "#E07A9A"; g.fill();
        g.restore();
    }
}
let CHECK = null;
function checker() { if (CHECK) return CHECK; const c = CHECK = document.createElement("canvas"); c.width = c.height = 24; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 24, 24); g.fillStyle = "#E8E4DC"; g.fillRect(0, 0, 12, 12); g.fillRect(12, 12, 12, 12); return c; }
const PV = { zoom: 3 };
function pvDraw() {
    const pv = document.getElementById("pv"), g = pv.getContext("2d"); g.clearRect(0, 0, pv.width, pv.height);
    const px = Math.max(8, Math.min(pv.width, pv.height) / PV.zoom);
    if (!PS.bg) { g.fillStyle = g.createPattern(checker(), "repeat"); g.fillRect(0, 0, pv.width, pv.height); }
    fillWith(g, unitFrom(ED.tile && Math.abs(ED.tile.width - px) < 2 ? ED.tile : tileCanvas(px)), pv.width, pv.height);
}
