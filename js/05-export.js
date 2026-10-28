// ===== ⬇ export: the tile as PNG · a Procreate brush · a page to print · a set to sell (zip). Options are remembered (localStorage mjpat_exp).
const EXP = Object.assign({ pngSize: "2048", brSize: "1024", brSrc: "shape", paper: "A4", cm: 6, inv: false }, (() => { try { return JSON.parse(localStorage.getItem("mjpat_exp")) || {}; } catch (e) { return {}; } })());
const expSave = () => { try { localStorage.setItem("mjpat_exp", JSON.stringify(EXP)); } catch (e) {} };
const blobOf = (c, type = "image/png", q) => new Promise(r => c.toBlob(r, type, q));
function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const stamp = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- zip (stored, no compression — PNGs are compressed already) + CRC-32
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
async function makeZip(files) {   // files: [[name, Uint8Array | Blob]]
    const parts = [], cen = []; let off = 0; const enc = new TextEncoder();
    for (const [name, data0] of files) {
        const data = data0 instanceof Uint8Array ? data0 : new Uint8Array(await data0.arrayBuffer()), nm = enc.encode(name), crc = crc32(data);
        const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
        h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
        parts.push(new Uint8Array(h.buffer), nm, data);
        const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
        c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
        cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
    }
    const csz = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: "application/zip" });
}
const b64u8 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

// ---------------------------------------------------------------- an 8-bit grey PNG (Procreate's own brush pictures are grey, colour type 0)
async function greyPng(gray, w, h) {
    const raw = new Uint8Array((w + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; raw.set(gray.subarray(y * w, y * w + w), y * (w + 1) + 1); }
    const z = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
    const chunk = (type, data) => { const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer); dv.setUint32(0, data.length); out.set(new TextEncoder().encode(type), 4); out.set(data, 8); dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length))); return out; };
    const ih = new Uint8Array(13), dv = new DataView(ih.buffer); dv.setUint32(0, w); dv.setUint32(4, h); ih[8] = 8; ih[9] = 0;
    return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", z), chunk("IEND", new Uint8Array(0))], { type: "image/png" });
}
// the repeat unit made square (a brush's grain repeats square): halfdrop 2 × 1 → stacked twice · brick 1 × 2 → side by side twice
function squareUnit(px, opts) {
    const [ux, uy] = UNIT[PS.rep], n = Math.max(ux, uy), t = px / n, u = unitCanvas(t, opts), c = document.createElement("canvas"); c.width = c.height = Math.round(t * n);
    const g = c.getContext("2d"); for (let x = 0; x < n; x += ux) for (let y = 0; y < n; y += uy) g.drawImage(u, x * t, y * t); return c;
}

// ---------------------------------------------------------------- the four ways out
async function exPng() {
    const px = +EXP.pngSize, [ux, uy] = UNIT[PS.rep];
    download(await blobOf(unitCanvas(px)), `milkjelly-pattern-${px * ux}x${px * uy}.png`);
}
// Procreate: the user's sample "Background" brush with its Grain.png swapped for the pattern (white = paint). "ทรงของลาย" = the pieces' shapes
// white on black (the ground left out) · "ความสว่าง" = the pattern's own lightness. Packed as a .brush (a zip) — opening it on the iPad adds it.
async function exBrush() {
    const N = +EXP.brSize, c = squareUnit(N, EXP.brSrc === "shape" ? { bg: false, solid: true } : {}), g = c.getContext("2d");
    const d = g.getImageData(0, 0, c.width, c.height).data, grey = new Uint8Array(c.width * c.height);
    for (let i = 0; i < grey.length; i++) {
        let v = EXP.brSrc === "shape" ? d[i * 4 + 3] : Math.round((d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) * d[i * 4 + 3] / 255);
        grey[i] = EXP.inv ? 255 - v : v;
    }
    // (the brush library's little picture: a soft stroke filled with the grain)
    const th = document.createElement("canvas"); th.width = 327; th.height = 100; const tg = th.getContext("2d");
    const gc = document.createElement("canvas"); gc.width = c.width; gc.height = c.height; const gi = gc.getContext("2d").createImageData(c.width, c.height);
    for (let i = 0; i < grey.length; i++) { gi.data[i * 4] = gi.data[i * 4 + 1] = gi.data[i * 4 + 2] = 30; gi.data[i * 4 + 3] = grey[i]; }
    gc.getContext("2d").putImageData(gi, 0, 0);
    tg.save(); tg.beginPath(); tg.moveTo(20, 70); tg.bezierCurveTo(90, 10, 200, 100, 307, 30); tg.lineWidth = 46; tg.lineCap = "round"; tg.strokeStyle = "#000"; tg.stroke();
    tg.globalCompositeOperation = "source-in"; const pt = tg.createPattern(gc, "repeat"); pt.setTransform(new DOMMatrix().scale(110 / c.width)); tg.fillStyle = pt; tg.fillRect(0, 0, 327, 100); tg.restore();
    const T = PB_TEMPLATES.bg;
    const zip = await makeZip([["Brush.archive", b64u8(T.archive)], ["Reset/Brush.archive", b64u8(T.reset)], ["Grain.png", await greyPng(grey, c.width, c.height)],
        ["Signature/SignaturePicture.png", b64u8(T.sig)], ["QuickLook/Thumbnail.png", await blobOf(th)]]);
    download(zip, `MilkJelly Pattern ${stamp()}.brush`);
}
const PAPERS = { A4: [210, 297], A3: [297, 420], Letter: [215.9, 279.4] };
function printPage() {   // the paper at 300 dpi, the tile EXP.cm wide
    const [mw, mh] = PAPERS[EXP.paper], dpmm = 300 / 25.4, w = Math.round(mw * dpmm), h = Math.round(mh * dpmm), t = EXP.cm * 10 * dpmm;
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); fillWith(g, unitCanvas(t), w, h); return c;
}
async function exPrintPng() { download(await blobOf(printPage()), `milkjelly-pattern-${EXP.paper}-${EXP.cm}cm.png`); }
async function exPrint() {
    const [mw, mh] = PAPERS[EXP.paper], url = URL.createObjectURL(await blobOf(printPage(), "image/jpeg", .95)), wnd = window.open("", "_blank");
    if (!wnd) { toast("เปิดหน้าพิมพ์ไม่ได้ — ใช้ดาวน์โหลดแทน"); return; }
    wnd.document.write(`<!doctype html><title>พิมพ์ลาย</title><style>@page{size:${mw}mm ${mh}mm;margin:0}html,body{margin:0}img{display:block;width:${mw}mm;height:${mh}mm}</style><img src="${url}" onload="setTimeout(()=>print(),300)">`);
    wnd.document.close();
}
// to sell: the usual digital paper 12 × 12 in at 300 dpi (3600 px, a tile = 3600 / 4) + the tile 2048 + a show picture
async function exSale() {
    const big = document.createElement("canvas"); big.width = big.height = 3600; const bg = big.getContext("2d"); fillWith(bg, unitCanvas(900), 3600, 3600);
    const [ux, uy] = UNIT[PS.rep], tile = unitCanvas(2048);
    const show = document.createElement("canvas"); show.width = show.height = 2000; const sg = show.getContext("2d");
    sg.fillStyle = "#F4F1EA"; sg.fillRect(0, 0, 2000, 2000);
    sg.save(); sg.shadowColor = "rgba(60,40,40,.25)"; sg.shadowBlur = 60; sg.shadowOffsetY = 24; sg.fillStyle = "#fff"; sg.beginPath(); sg.roundRect(160, 160, 1680, 1680, 40); sg.fill(); sg.restore();
    sg.save(); sg.beginPath(); sg.roundRect(200, 200, 1600, 1600, 24); sg.clip(); fillWith(sg, unitCanvas(400), 2000, 2000, 200, 200); sg.restore();
    const zip = await makeZip([["pattern-12x12in-300dpi.png", await blobOf(big)], [`tile-${2048 * ux}x${2048 * uy}.png`, await blobOf(tile)], ["preview.jpg", await blobOf(show, "image/jpeg", .92)]]);
    download(zip, `milkjelly-pattern-set-${stamp()}.zip`);
}

// ---------------------------------------------------------------- the window
function expSync() {
    document.querySelectorAll("#expOv .seg").forEach(s => s.querySelectorAll("button").forEach(b => b.classList.toggle("on", String(EXP[s.dataset.opt]) === b.dataset.v)));
    $("brInv").checked = !!EXP.inv; $("cmIn").value = EXP.cm; $("cmV").textContent = EXP.cm;
}
async function busy(btn, fn) {
    if (!PS.items.length && !PS.base) { toast("ยังไม่มีลาย — เพิ่มชิ้นหรือเลือกลายสำเร็จก่อน"); return; }
    btn.classList.add("busy"); const t = btn.textContent; btn.textContent = "กำลังทำ…";
    await new Promise(r => setTimeout(r, 30));
    try { await fn(); } catch (e) { console.error(e); toast("ส่งออกไม่สำเร็จ"); }
    btn.classList.remove("busy"); btn.textContent = t;
}
$("exportBtn").onclick = () => { expSync(); $("expOv").hidden = false; };
$("expX").onclick = () => $("expOv").hidden = true;
$("expOv").addEventListener("pointerdown", e => { if (e.target === $("expOv")) $("expOv").hidden = true; });
addEventListener("keydown", e => { if (e.key === "Escape") $("expOv").hidden = true; });
$("expOv").addEventListener("click", e => { const b = e.target.closest(".seg button"); if (b) { EXP[b.closest(".seg").dataset.opt] = b.dataset.v; expSave(); expSync(); } });
$("brInv").onchange = e => { EXP.inv = e.target.checked; expSave(); };
$("cmIn").oninput = e => { EXP.cm = +e.target.value; $("cmV").textContent = EXP.cm; expSave(); };
for (const [id, fn] of [["exPng", exPng], ["exBrush", exBrush], ["exPrintPng", exPrintPng], ["exPrint", exPrint], ["exSale", exSale]]) $(id).onclick = e => busy(e.currentTarget, fn);
