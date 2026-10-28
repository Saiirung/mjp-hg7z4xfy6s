// ===== ▦ ready-made patterns (mode "ready", user 2026-10-28): a ground pattern under the pieces — PS.base {kind, c (its colour), n (repeats a tile,
// whole numbers so it always joins up), size (0.05–1, of a repeat), stag (dots / hearts / stars: a second set between them), dir (stripes: v / h /
// d "/" / e "\")} or null. Drawn by drawBase right after the ground (02-render drawTile); the ✋ pieces go on top. Two colours = its colour + the ground.
const RD_KINDS = {
    dots: { name: "จุด", ic: '<circle cx="7" cy="7" r="3.2"/><circle cx="21" cy="7" r="3.2"/><circle cx="14" cy="14" r="3.2"/><circle cx="7" cy="21" r="3.2"/><circle cx="21" cy="21" r="3.2"/>', stag: true },
    stripes: { name: "ทาง", ic: '<rect x="3" y="2" width="4" height="24" rx="1"/><rect x="12" y="2" width="4" height="24" rx="1"/><rect x="21" y="2" width="4" height="24" rx="1"/>', dir: true },
    grid: { name: "เส้นตาราง", ic: '<path d="M2 9h24M2 19h24M9 2v24M19 2v24" stroke="currentColor" stroke-width="2.4" fill="none"/>' },
    gingham: { name: "กิงแฮม", ic: '<g opacity=".55"><rect x="2" y="2" width="6" height="24"/><rect x="14" y="2" width="6" height="24"/><rect x="2" y="2" width="24" height="6"/><rect x="2" y="14" width="24" height="6"/></g>' },
    checker: { name: "หมากรุก", ic: '<rect x="2" y="2" width="8" height="8"/><rect x="18" y="2" width="8" height="8"/><rect x="10" y="10" width="8" height="8"/><rect x="2" y="18" width="8" height="8"/><rect x="18" y="18" width="8" height="8"/>' },
    zigzag: { name: "ซิกแซก", ic: '<path d="M2 10l4-5 4 5 4-5 4 5 4-5 4 5M2 22l4-5 4 5 4-5 4 5 4-5 4 5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linejoin="round"/>' },
    hearts: { name: "หัวใจ", ic: '<path d="M14 24 5 15c-4-4-1-11 4-11 2 0 4 1 5 3 1-2 3-3 5-3 5 0 8 7 4 11z"/>', stag: true },
    stars: { name: "ดาว", ic: '<path d="M14 2l3.4 7.6 8.2.8-6.2 5.5 1.8 8.1L14 19.8 6.8 24l1.8-8.1L2.4 10.4l8.2-.8z"/>', stag: true },
};
const RD_COLS = ["#F7B9CB", "#F07A8E", "#F8D57E", "#B9E3D2", "#A7BFDF", "#C9B8EC", "#FFFFFF", "#3E3A36"];
const rdDefault = kind => ({ kind, c: PS.base?.c || "#F7B9CB", n: { dots: 6, stripes: 8, grid: 8, gingham: 6, checker: 8, zigzag: 6, hearts: 4, stars: 4 }[kind], size: { dots: .45, stripes: .5, grid: .12, gingham: .5, checker: 1, zigzag: .25, hearts: .6, stars: .6 }[kind], stag: kind === "dots", dir: "v" });

function heartPath(g, x, y, r) {   // (r = half its width)
    g.moveTo(x, y + r * .9);
    g.bezierCurveTo(x - r * 1.3, y, x - r * 1.1, y - r * 1.15, x - r * .5, y - r * .95);
    g.bezierCurveTo(x - r * .15, y - r * .85, x, y - r * .55, x, y - r * .4);
    g.bezierCurveTo(x, y - r * .55, x + r * .15, y - r * .85, x + r * .5, y - r * .95);
    g.bezierCurveTo(x + r * 1.1, y - r * 1.15, x + r * 1.3, y, x, y + r * .9); g.closePath();
}
function starPath(g, x, y, r) { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
// the ground pattern on the tile (g in tile units) — solid = white shapes (the brush's "shape of the pattern")
function drawBase(g, solid) {
    const B = PS.base; if (!B) return;
    // (whole repeats a tile so it joins up; checker repeats every 2 · half-drop / brick move a tile by half, so it needs twice that — rounded up)
    const step = (B.kind === "checker" ? 2 : 1) * (PS.rep === "halfdrop" || PS.rep === "brick" ? 2 : 1), n = rdN(B), P = W / n, s = Math.max(.05, Math.min(1, B.size));
    g.save(); g.fillStyle = g.strokeStyle = solid ? "#fff" : B.c;
    const pts = stag => { const L = []; for (let i = -1; i <= n; i++) for (let j = -1; j <= n; j++) { L.push([(i + .5) * P, (j + .5) * P]); if (stag) L.push([i * P, j * P]); } return L; };
    if (B.kind === "dots") { g.beginPath(); for (const [x, y] of pts(B.stag)) { g.moveTo(x + s * P / 2, y); g.arc(x, y, s * P / 2, 0, 7); } g.fill(); }
    else if (B.kind === "hearts") { g.beginPath(); for (const [x, y] of pts(B.stag)) heartPath(g, x, y, s * P / 2); g.fill(); }
    else if (B.kind === "stars") { g.beginPath(); for (const [x, y] of pts(B.stag)) starPath(g, x, y, s * P / 2); g.fill(); }
    else if (B.kind === "stripes") {
        const bw = s * P; g.beginPath();   // (each band centred in its repeat — the same flipped, so mirror joins up too)
        for (let k = -n - 1; k <= 2 * n + 1; k++) {
            const x = (k + .5) * P - bw / 2;
            if (B.dir === "v") g.rect(x, 0, bw, W);
            else if (B.dir === "h") g.rect(0, x, W, bw);
            else if (B.dir === "d") { g.moveTo(x, 0); g.lineTo(x + bw, 0); g.lineTo(x + bw - W, W); g.lineTo(x - W, W); g.closePath(); }
            else { g.moveTo(x, 0); g.lineTo(x + bw, 0); g.lineTo(x + bw + W, W); g.lineTo(x + W, W); g.closePath(); }
        }
        g.fill();
    }
    else if (B.kind === "grid") { const lw = Math.max(2, s * P * .5); g.beginPath(); for (let k = 0; k <= n; k++) { g.rect(k * P - lw / 2, -1, lw, W + 2); g.rect(-1, k * P - lw / 2, W + 2, lw); } g.fill(); }
    else if (B.kind === "gingham") {
        const bw = s * P; if (!solid) g.globalAlpha = .5;
        g.beginPath(); for (let k = 0; k < n; k++) g.rect((k + .5) * P - bw / 2, 0, bw, W); g.fill();
        g.beginPath(); for (let k = 0; k < n; k++) g.rect(0, (k + .5) * P - bw / 2, W, bw); g.fill();
    }
    else if (B.kind === "checker") {   // (squares centred on the grid's corners — the tile's edge cuts them in half, so flipped they still alternate)
        const q = s * P; g.beginPath(); for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) if ((i + j) % 2 === 0) g.rect(i * P - q / 2, j * P - q / 2, q, q); g.fill();
    }
    else if (B.kind === "zigzag") {
        g.lineWidth = Math.max(2, s * P * .5); g.lineJoin = "miter"; g.miterLimit = 10; g.beginPath();
        for (let r = -1; r <= n; r++) { const y = (r + .5) * P; for (let k = -2; k <= 2 * n + 2; k++) g[k === -2 ? "moveTo" : "lineTo"](k * P / 2, y + (k % 2 ? -1 : 1) * P * .22); }
        g.stroke();
    }
    g.restore();
}

function rdN(B) { const step = (B.kind === "checker" ? 2 : 1) * (PS.rep === "halfdrop" || PS.rep === "brick" ? 2 : 1); return Math.max(step, Math.ceil(Math.round(B.n) / step) * step); }
// ---------------------------------------------------------------- the card
function rdCard() {
    const B = PS.base, C = $("readyCard");
    C.querySelectorAll("[data-rk]").forEach(b => b.classList.toggle("on", (B?.kind || "") === b.dataset.rk));
    $("rdOpts").hidden = !B; if (!B) return;
    $("rdCols").innerHTML = RD_COLS.map(c => `<button class="sw${c === B.c ? " on" : ""}" data-rc="${c}" style="background:${c}" aria-label="สี ${c}"></button>`).join("")
        + `<button class="sw${RD_COLS.includes(B.c) ? "" : " on"}" style="background:conic-gradient(#F7B9CB,#F8D57E,#B9E3D2,#A7BFDF,#C9B8EC,#F7B9CB)" aria-label="เลือกสีเอง"><input type="color" id="rdPick" value="${B.c}"></button>`;
    $("rdN").value = B.n; $("rdNV").textContent = rdN(B); $("rdSize").value = Math.round(B.size * 100);
    $("rdStag").parentElement.hidden = !RD_KINDS[B.kind].stag; $("rdStag").checked = !!B.stag;
    $("rdDir").hidden = !RD_KINDS[B.kind].dir; $("rdDir").querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.v === B.dir));
}
function rdSet(fn, commit = true) { fn(PS.base); rdCard(); psDraw(); if (commit) psCommit(); }
(() => {
    const C = $("readyCard");
    $("rdKinds").innerHTML = `<button data-rk="" aria-label="ไม่มีลาย"><svg viewBox="0 0 28 28"><path d="M6 6l16 16M22 6 6 22" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>`
        + Object.entries(RD_KINDS).map(([k, v]) => `<button data-rk="${k}" aria-label="${v.name}"><svg viewBox="0 0 28 28" fill="currentColor">${v.ic}</svg></button>`).join("");
    $("rdKinds").onclick = e => { const b = e.target.closest("[data-rk]"); if (!b) return; const k = b.dataset.rk; PS.base = k ? (PS.base ? Object.assign(rdDefault(k), { c: PS.base.c }) : rdDefault(k)) : null; rdCard(); psCommit(); psDraw(); };
    $("rdCols").onclick = e => { const b = e.target.closest("[data-rc]"); if (b) rdSet(B => B.c = b.dataset.rc); };
    $("rdCols").addEventListener("input", e => { if (e.target.id === "rdPick") { PS.base.c = e.target.value; psDraw(); } });
    $("rdCols").addEventListener("change", e => { if (e.target.id === "rdPick") rdSet(() => {}); });
    $("rdN").oninput = e => rdSet(B => B.n = +e.target.value, false); $("rdN").onchange = () => psCommit();
    $("rdSize").oninput = e => rdSet(B => B.size = +e.target.value / 100, false); $("rdSize").onchange = () => psCommit();
    $("rdStag").onchange = e => rdSet(B => B.stag = e.target.checked);
    $("rdDir").onclick = e => { const b = e.target.closest("[data-v]"); if (b) rdSet(B => B.dir = b.dataset.v); };
    // the panels follow the work + the mode
    const _c = psChanged; psChanged = light => { _c(light); if (!light) rdCard(); };
})();
// ✋ / ▦ / ✏️ / 🖼️ : which cards show (CSS body[data-mode]), the tools only in ✋ (the mat shows every layer; pieces are picked only in ✋)
function setMode(m) {
    PS.mode = m; document.body.dataset.mode = m;
    document.querySelectorAll(".modes button").forEach(b => b.classList.toggle("on", b.dataset.mode === m));
    if (m !== "place") { PS.sel = null; }
    ED.cv.style.cursor = m === "draw" ? "crosshair" : m === "photo" ? "grab" : "default";
    psChanged(); psDraw();
}
