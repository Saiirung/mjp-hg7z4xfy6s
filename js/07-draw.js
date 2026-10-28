// ===== ✏️ draw (mode "draw", user 2026-10-28): strokes on the tile that wrap over the edges like the pieces do. Kept as lines, not pixels —
// PS.strokes [{id, t (tool: pen / marker / erase), c, sz (width, tile units), a (opacity), p ([x, y, pressure, …] tile units)}] — so they are
// drawn sharp at any export size, follow the arrangement (wrapped by OFFS at drawing time) and undo / save with the work. On top of everything
// (the eraser takes away only drawing). Apple Pencil: its pressure sets the width. One layer picture is kept per size (DRW.cache) and only made
// again when the strokes change; the stroke being drawn goes on a copy of it.
const DRW = { tool: "pen", c: "#F07A8E", sz: 14, a: 1, cur: null, cache: new Map(), tmp: null };
try { Object.assign(DRW, JSON.parse(localStorage.getItem("mjpat_draw")) || {}); DRW.cur = null; DRW.cache = new Map(); } catch (e) {}
const drwSave = () => { try { localStorage.setItem("mjpat_draw", JSON.stringify({ tool: DRW.tool, c: DRW.c, sz: DRW.sz, a: DRW.a })); } catch (e) {} };

// one stroke onto g (in tile units): each wrapped copy; segments with round ends (their widths follow the pressure)
function strokePaths(g, st) {
    const p = st.p, offs = OFFS[PS.rep];
    g.lineCap = g.lineJoin = "round"; g.strokeStyle = g.fillStyle = st.t === "erase" ? "#000" : st.c;
    const even = p.every((v, i) => i % 3 !== 2 || v === p[2]);
    for (const [ox, oy] of offs) {
        if (p.length === 3) { g.beginPath(); g.arc(p[0] + ox, p[1] + oy, st.sz * p[2] / 2, 0, 7); g.fill(); continue; }
        if (even) {   // (one width: one path — smooth curves through the midpoints)
            g.lineWidth = st.sz * p[2]; g.beginPath(); g.moveTo(p[0] + ox, p[1] + oy);
            for (let i = 3; i < p.length - 3; i += 3) g.quadraticCurveTo(p[i] + ox, p[i + 1] + oy, (p[i] + p[i + 3]) / 2 + ox, (p[i + 1] + p[i + 4]) / 2 + oy);
            g.lineTo(p[p.length - 3] + ox, p[p.length - 2] + oy); g.stroke();
        } else for (let i = 3; i < p.length; i += 3) {
            g.lineWidth = st.sz * (p[i - 1] + p[i + 2]) / 2; g.beginPath(); g.moveTo(p[i - 3] + ox, p[i - 2] + oy); g.lineTo(p[i] + ox, p[i + 1] + oy); g.stroke();
        }
    }
}
// a stroke onto a layer canvas c (px a tile): see-through ones / the eraser go through a scratch canvas so a stroke is one even colour
function strokeOnto(c, st) {
    const g = c.getContext("2d"), k = c.width / W;
    if (st.t === "erase" || st.a < 1) {
        const t = DRW.tmp && DRW.tmp.width === c.width ? DRW.tmp : (DRW.tmp = Object.assign(document.createElement("canvas"), { width: c.width, height: c.height }));
        const tg = t.getContext("2d"); tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, t.width, t.height); tg.setTransform(k, 0, 0, k, 0, 0); strokePaths(tg, st);
        g.save(); g.globalCompositeOperation = st.t === "erase" ? "destination-out" : "source-over"; g.globalAlpha = st.t === "erase" ? 1 : st.a; g.drawImage(t, 0, 0); g.restore();
    } else { g.save(); g.setTransform(k, 0, 0, k, 0, 0); strokePaths(g, st); g.restore(); }
}
// the finished strokes as one picture px wide (kept until they change)
function strokeLayer(px) {
    px = Math.round(px);
    const sig = PS.rep + "|" + PS.strokes.length + "|" + (PS.strokes.length ? PS.strokes[PS.strokes.length - 1].id + PS.strokes[0].id : "");
    let e = DRW.cache.get(px);
    if (!e || e.sig !== sig) {
        const c = e?.c || Object.assign(document.createElement("canvas"), { width: px, height: px });
        c.getContext("2d").clearRect(0, 0, px, px); for (const st of PS.strokes) strokeOnto(c, st);
        e = { c, sig }; DRW.cache.set(px, e); if (DRW.cache.size > 4) DRW.cache.delete(DRW.cache.keys().next().value);
    }
    if (!DRW.cur) return e.c;
    const live = DRW.live && DRW.live.width === px ? DRW.live : (DRW.live = Object.assign(document.createElement("canvas"), { width: px, height: px }));
    const lg = live.getContext("2d"); lg.clearRect(0, 0, px, px); lg.drawImage(e.c, 0, 0); strokeOnto(live, DRW.cur); return live;
}
// (02-render drawTile calls this last — solid: the strokes white, the brush's "shape of the pattern")
function drawStrokes(g, opts = {}) {
    if (!PS.strokes.length && !DRW.cur) return;
    const px = Math.max(1, g.getTransform().a * W), L = strokeLayer(px);
    if (opts.solid) { const s = Object.assign(document.createElement("canvas"), { width: L.width, height: L.height }), sg = s.getContext("2d"); sg.drawImage(L, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#fff"; sg.fillRect(0, 0, s.width, s.height); g.drawImage(s, 0, 0, W, W); }
    else g.drawImage(L, 0, 0, W, W);
}

// ---------------------------------------------------------------- drawing on the mat
function drwDown(e) {
    if (PS.mode !== "draw" || e.button > 0) return;
    ED.cv.setPointerCapture(e.pointerId);
    const [u, v] = toTile(e.clientX, e.clientY), pr = e.pointerType === "pen" ? Math.max(.15, e.pressure || .5) : 1;
    DRW.cur = { id: uid(), t: DRW.tool, c: DRW.c, sz: DRW.sz, a: DRW.tool === "marker" ? Math.min(DRW.a, .5) : DRW.a, p: [r1(u), r1(v), pr] };
    DRW.pid = e.pointerId; psDraw();
}
const r1 = v => Math.round(v * 10) / 10;
function drwMove(e) {
    if (!DRW.cur || e.pointerId !== DRW.pid) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of evs.length ? evs : [e]) {
        const [u, v] = toTile(ce.clientX, ce.clientY), p = DRW.cur.p, n = p.length;
        if (Math.hypot(u - p[n - 3], v - p[n - 2]) < Math.max(1.2, DRW.cur.sz * .12)) continue;
        p.push(r1(u), r1(v), ce.pointerType === "pen" ? Math.max(.15, ce.pressure || .5) : 1);
    }
    psDraw();
}
function drwUp(e) {
    if (!DRW.cur || e.pointerId !== DRW.pid) return;
    PS.strokes.push(DRW.cur); DRW.cur = null; psCommit(); psDraw();
}

// ---------------------------------------------------------------- the card
function drwCard() {
    const C = $("drawCard"); if (!C) return;
    C.querySelectorAll("[data-dt]").forEach(b => b.classList.toggle("on", b.dataset.dt === DRW.tool));
    $("dwCols").innerHTML = RD_COLS.map(c => `<button class="sw${c === DRW.c ? " on" : ""}" data-dc="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join("")
        + `<button class="sw${RD_COLS.includes(DRW.c) ? "" : " on"}" style="background:conic-gradient(#F7B9CB,#F8D57E,#B9E3D2,#A7BFDF,#C9B8EC,#F7B9CB)" aria-label="เลือกสีเอง"><input type="color" id="dwPick" value="${DRW.c}"></button>`;
    $("dwSz").value = DRW.sz; $("dwA").value = Math.round(DRW.a * 100); $("dwA").closest(".prop").hidden = DRW.tool === "erase";
    $("dwCols").hidden = DRW.tool === "erase"; $("dwClear").disabled = !PS.strokes.length;
}
(() => {
    ED.cv = ED.cv || $("ed");
    $("ed").addEventListener("pointerdown", drwDown); $("ed").addEventListener("pointermove", drwMove);
    $("ed").addEventListener("pointerup", drwUp); $("ed").addEventListener("pointercancel", drwUp);
    $("drawCard").addEventListener("click", e => {
        const t = e.target.closest("[data-dt]"); if (t) { DRW.tool = t.dataset.dt; drwSave(); drwCard(); return; }
        const c = e.target.closest("[data-dc]"); if (c) { DRW.c = c.dataset.dc; if (DRW.tool === "erase") DRW.tool = "pen"; drwSave(); drwCard(); }
    });
    $("dwCols").addEventListener("input", e => { if (e.target.id === "dwPick") { DRW.c = e.target.value; drwSave(); } });
    $("dwCols").addEventListener("change", e => { if (e.target.id === "dwPick") drwCard(); });
    $("dwSz").oninput = e => { DRW.sz = +e.target.value; drwSave(); };
    $("dwA").oninput = e => { DRW.a = +e.target.value / 100; drwSave(); };
    $("dwClear").onclick = () => { if (!PS.strokes.length) return; PS.strokes = []; psCommit(); psDraw(); toast("ล้างที่วาดแล้ว — ↶ ย้อนได้"); };
    const _c = psChanged; psChanged = light => { _c(light); if (!light) drwCard(); };
})();
