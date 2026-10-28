// ===== the mat: picking, moving, sizing, turning pieces (mouse, finger, pen — pointer events).
// A press on a piece (or on a wrapped copy of it — the copy you see is the one you hold) picks it; dragging moves it, and on letting go it is
// brought back into the tile (its place modulo W — the pattern looks the same). The round handle at its corner = size + turn together.
// Two fingers on iPad = size + turn the picked piece. The wheel = size (Shift = turn). Keys: Delete · Ctrl+Z / Y · Ctrl+D · arrows.
const toTile = (cx, cy) => { const r = ED.cv.getBoundingClientRect(); return [(cx - r.left - ED.x0) / ED.T * W, (cy - r.top - ED.y0) / ED.T * W]; };
function hitPiece(u, v) {   // the top piece under (u, v) tile units — any of its copies → {it, ox, oy}
    for (let i = PS.items.length - 1; i >= 0; i--) {
        const it = PS.items[i], a = -it.r * Math.PI / 180, w = it.s / 2, h = it.s * it.ar / 2;
        // (the copies of the wrapped pattern around the tile too: a press on a faint neighbour picks that copy)
        // (mirror: the neighbours are flipped — only the piece itself can be picked)
        const G = PS.rep === "mirror" ? 0 : 1;
        for (let gx = -G; gx <= G; gx++) for (let gy = -G; gy <= G; gy++) for (const [ox0, oy0] of OFFS[PS.rep]) {
            const ox = ox0 + gx * W * UNIT[PS.rep][0], oy = oy0 + gy * W * UNIT[PS.rep][1];
            const dx = u - (it.x + ox), dy = v - (it.y + oy), lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
            if (Math.abs(lx) <= w && Math.abs(ly) <= h) return { it, ox, oy };
        }
    }
    return null;
}
function onHandle(u, v) {
    const it = selItem(); if (!it) return false;
    const [ox, oy] = PS.selOff || [0, 0], a = it.r * Math.PI / 180, w = it.s / 2, h = it.s * it.ar / 2;
    const hx = it.x + ox + w * Math.cos(a) - h * Math.sin(a), hy = it.y + oy + w * Math.sin(a) + h * Math.cos(a);
    return Math.hypot(u - hx, v - hy) < 22 / ED.T * W;
}
// a piece back inside the tile (mirror: kept where it is — no wrapping there)
function wrapIn(it) {
    if (PS.rep === "mirror") { it.x = Math.max(0, Math.min(W, it.x)); it.y = Math.max(0, Math.min(W, it.y)); return; }
    if (PS.rep === "halfdrop") { const c = Math.floor(it.x / W); it.x -= c * W; it.y -= c * W / 2; }
    if (PS.rep === "brick") { const r = Math.floor(it.y / W); it.y -= r * W; it.x -= r * W / 2; }
    it.x = ((it.x % W) + W) % W; it.y = ((it.y % W) + W) % W;
}
const DR = { mode: "", pts: new Map() };
function edDown(e) {
    if (PS.mode !== "place") return;
    ED.cv.setPointerCapture(e.pointerId); DR.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const it0 = selItem();
    if (DR.pts.size === 2 && it0) {   // two fingers: size + turn
        const [a, b] = [...DR.pts.values()];
        Object.assign(DR, { mode: "pinch", d0: Math.hypot(b[0] - a[0], b[1] - a[1]), a0: Math.atan2(b[1] - a[1], b[0] - a[0]), s0: it0.s, r0: it0.r });
        return;
    }
    const [u, v] = toTile(e.clientX, e.clientY);
    if (onHandle(u, v)) {
        const it = selItem(), [ox, oy] = PS.selOff || [0, 0], cx = it.x + ox, cy = it.y + oy;
        Object.assign(DR, { mode: "turn", cx, cy, d0: Math.hypot(u - cx, v - cy), a0: Math.atan2(v - cy, u - cx), s0: it.s, r0: it.r });
        return;
    }
    const hit = hitPiece(u, v);
    if (hit) {
        PS.sel = hit.it.id; PS.selOff = [hit.ox, hit.oy];
        Object.assign(DR, { mode: "move", u0: u, v0: v, x0: hit.it.x, y0: hit.it.y, moved: false });
    } else { PS.sel = null; DR.mode = ""; }
    psChanged(); psDraw();
}
function edMove(e) {
    if (!DR.pts.has(e.pointerId)) { edHover(e); return; }
    DR.pts.set(e.pointerId, [e.clientX, e.clientY]);
    const it = selItem(); if (!it || !DR.mode) return;
    if (DR.mode === "pinch") {
        const [a, b] = [...DR.pts.values()]; if (!b) return;
        it.s = Math.max(8, Math.min(3 * W, DR.s0 * Math.hypot(b[0] - a[0], b[1] - a[1]) / DR.d0));
        it.r = norm(DR.r0 + (Math.atan2(b[1] - a[1], b[0] - a[0]) - DR.a0) * 180 / Math.PI);
    } else {
        const [u, v] = toTile(e.clientX, e.clientY);
        if (DR.mode === "move") { it.x = DR.x0 + u - DR.u0; it.y = DR.y0 + v - DR.v0; DR.moved = true; }
        else if (DR.mode === "turn") {
            it.s = Math.max(8, Math.min(3 * W, DR.s0 * Math.hypot(u - DR.cx, v - DR.cy) / DR.d0));
            let r = DR.r0 + (Math.atan2(v - DR.cy, u - DR.cx) - DR.a0) * 180 / Math.PI;
            if (e.shiftKey) r = Math.round(r / 15) * 15; it.r = norm(r);
        }
    }
    psDraw(); psChanged(true);
}
function edUp(e) {
    DR.pts.delete(e.pointerId);
    if (DR.pts.size) return;
    const it = selItem();
    if (it && DR.mode === "move" && DR.moved) {   // (back into the tile; the copy held stays under the finger)
        const bx = it.x, by = it.y; wrapIn(it); PS.selOff = [PS.selOff[0] + bx - it.x, PS.selOff[1] + by - it.y];
    }
    DR.mode = ""; psCommit(); psDraw();
}
const norm = r => ((r + 180) % 360 + 360) % 360 - 180;
function edHover(e) {
    if (e.pointerType !== "mouse") return;
    const [u, v] = toTile(e.clientX, e.clientY);
    ED.cv.style.cursor = onHandle(u, v) ? "nwse-resize" : hitPiece(u, v) ? "move" : "default";
}
let wheelT = 0;
function edWheel(e) {
    const it = selItem(); if (!it || PS.mode !== "place") return;
    e.preventDefault();
    if (e.shiftKey) it.r = norm(it.r + Math.sign(e.deltaY || e.deltaX) * 5);
    else it.s = Math.max(8, Math.min(3 * W, it.s * Math.pow(1.0015, -e.deltaY)));
    psDraw(); psChanged(true); clearTimeout(wheelT); wheelT = setTimeout(psCommit, 300);
}
function edKey(e) {
    if (e.target.closest("input, textarea")) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? psRedo() : psUndo(); return; }
    if (mod && k === "y") { e.preventDefault(); psRedo(); return; }
    if (mod && k === "d") { e.preventDefault(); pieceDup(); return; }
    const it = selItem(); if (!it) return;
    if (k === "delete" || k === "backspace") { e.preventDefault(); pieceDel(); return; }
    if (k === "escape") { PS.sel = null; psChanged(); psDraw(); return; }
    const st = e.shiftKey ? 20 : 2, mv = { arrowleft: [-st, 0], arrowright: [st, 0], arrowup: [0, -st], arrowdown: [0, st] }[k];
    if (mv) { e.preventDefault(); it.x += mv[0]; it.y += mv[1]; wrapIn(it); psDraw(); clearTimeout(wheelT); wheelT = setTimeout(psCommit, 300); }
}

// ---------------------------------------------------------------- pieces in and out
function pieceAdd(img, ar, extra = {}) {
    const it = Object.assign({ id: uid(), img, x: W / 2 + (Math.random() - .5) * W * .2, y: W / 2 + (Math.random() - .5) * W * .2, s: W * .26, ar, r: 0, fx: false }, extra);
    PS.items.push(it); PS.sel = it.id; PS.selOff = [0, 0]; psCommit(); psDraw(); return it;
}
async function addFiles(files) {
    if (PS.mode === "photo") { const f = files.find(f => f.type.startsWith("image/")); if (f) photoFromFile(f); return; }   // (🖼️: the picture becomes the photo tile)
    if (PS.mode !== "place") setMode("place");
    let n = 0;
    for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        try { const { src, ar } = await imgFromFile(f), key = "u:" + uid(); imgAdd(key, src); await IMG.get(key).ready; pieceAdd(key, ar, { name: f.name.replace(/\.[^.]+$/, "") }); n++; }
        catch (e) { toast("เปิดรูปนี้ไม่ได้"); }
    }
    if (n) toast(`เพิ่ม ${n} รูปแล้ว`);
}
function pieceDup() {
    const it = selItem(); if (!it) return;
    const c = Object.assign({}, it, { id: uid(), x: it.x + W * .08, y: it.y + W * .08 }); wrapIn(c);
    PS.items.push(c); PS.sel = c.id; PS.selOff = [0, 0]; psCommit(); psDraw();
}
function pieceDel() {
    const i = PS.items.findIndex(x => x.id === PS.sel); if (i < 0) return;
    PS.items.splice(i, 1); PS.sel = null; psCommit(); psDraw();
}
// 🎲 the picked piece copied 6 times over the tile (a little bigger / smaller, turned) — none picked: everything moved to new random places
function scatter() {
    const it = selItem(), R = () => Math.random();
    if (it) { for (let k = 0; k < 6; k++) PS.items.push(Object.assign({}, it, { id: uid(), x: R() * W, y: R() * W, s: it.s * (.7 + R() * .6), r: norm(it.r + (R() - .5) * 70) })); toast("กระจายเพิ่ม 6 ชิ้น"); }
    else if (PS.items.length) { for (const p of PS.items) { p.x = R() * W; p.y = R() * W; p.r = norm(p.r + (R() - .5) * 50); } toast("สุ่มที่วางใหม่"); }
    else { toast("เลือกชิ้นก่อน แล้วกด 🎲"); return; }
    psCommit(); psDraw();
}
