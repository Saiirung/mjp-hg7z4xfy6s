// ===== the panels: tools, stickers, text, arrangement, ground colour, the picked piece, the list of pieces; drop / paste; start-up.
const $ = id => document.getElementById(id);
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1800); }

// built-in stickers (drawn here, so the app needs no files) — "st:<name>"
const STK = {
    straw: '<path d="M50 22c22 0 34 12 30 32-4 22-20 38-30 38S24 76 20 54C16 34 28 22 50 22z" fill="#F07A8E"/><g fill="#FFE9A8"><circle cx="38" cy="44" r="2.6"/><circle cx="56" cy="40" r="2.6"/><circle cx="47" cy="58" r="2.6"/><circle cx="64" cy="56" r="2.6"/><circle cx="34" cy="62" r="2.6"/><circle cx="52" cy="74" r="2.6"/></g><path d="M50 26 36 14l10 4 4-10 4 10 10-4z" fill="#7CC59A"/>',
    heart: '<path d="M50 84 18 52C4 38 14 14 32 14c8 0 14 5 18 11 4-6 10-11 18-11 18 0 28 24 14 38z" fill="#F7B9CB"/><path d="M30 26c-6 2-9 8-8 14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>',
    star: '<path d="M50 10l11 25 27 3-20 18 6 27-24-14-24 14 6-27-20-18 27-3z" fill="#F8D57E" stroke="#F8D57E" stroke-width="6" stroke-linejoin="round"/>',
    flower: '<g fill="#A7BFDF"><circle cx="50" cy="26" r="17"/><circle cx="74" cy="44" r="17"/><circle cx="65" cy="72" r="17"/><circle cx="35" cy="72" r="17"/><circle cx="26" cy="44" r="17"/></g><circle cx="50" cy="52" r="12" fill="#FFF3C4"/>',
    dot: '<circle cx="50" cy="50" r="40" fill="#B9E3D2"/>',
    cloud: '<path d="M28 74h46a16 16 0 0 0 2-32 22 22 0 0 0-42-4 18 18 0 0 0-6 36z" fill="#fff" stroke="#DCE6F2" stroke-width="3"/>',
    leaf: '<path d="M20 80C20 40 50 18 84 16c0 38-24 66-64 64z" fill="#9FD3A8"/><path d="M22 78 70 30" stroke="#7CB98A" stroke-width="4" stroke-linecap="round"/>',
    cherry: '<path d="M38 66C40 44 50 26 66 16M64 62C62 44 62 30 66 16" stroke="#7CC59A" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="36" cy="70" r="16" fill="#E9667E"/><circle cx="64" cy="68" r="16" fill="#E9667E"/><circle cx="31" cy="64" r="4" fill="#fff" opacity=".6"/><circle cx="59" cy="62" r="4" fill="#fff" opacity=".6"/>',
    bow: '<path d="M50 50 16 30c-6 10-6 30 0 40zM50 50l34-20c6 10 6 30 0 40z" fill="#F7B9CB"/><path d="M50 50 38 86M50 50l12 36" stroke="#F7B9CB" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="9" fill="#EE9AB2"/>',
    moon: '<path d="M62 14a38 38 0 1 0 24 58A32 32 0 0 1 62 14z" fill="#F8D57E"/>',
    sparkle: '<path d="M50 8c4 24 18 38 42 42-24 4-38 18-42 42-4-24-18-38-42-42 24-4 38-18 42-42z" fill="#C9B8EC"/>',
    mush: '<path d="M14 52a36 30 0 0 1 72 0z" fill="#F07A8E"/><g fill="#fff"><circle cx="36" cy="38" r="6"/><circle cx="58" cy="32" r="5"/><circle cx="70" cy="46" r="4"/></g><path d="M38 52h24l4 30H34z" fill="#FFF3E2"/>',
};
const stkSrc = k => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">${STK[k]}</svg>`);
for (const k of Object.keys(STK)) imgAdd("st:" + k, stkSrc(k));
const STK_NAME = { straw: "สตรอว์เบอร์รี", heart: "หัวใจ", star: "ดาว", flower: "ดอกไม้", dot: "จุด", cloud: "เมฆ", leaf: "ใบไม้", cherry: "เชอร์รี", bow: "โบว์", moon: "พระจันทร์", sparkle: "ประกาย", mush: "เห็ด" };

// text pieces: the text drawn into a picture ("t:<id>"), made again when the text / colour changes
function textPic(text, col) {
    const c = document.createElement("canvas"), g = c.getContext("2d"), F = '700 160px KoHo, "IBM Plex Sans Thai", sans-serif';
    g.font = F; const m = g.measureText(text || " "), w = Math.ceil(m.width + 40), h = 230;
    c.width = Math.max(60, w); c.height = h; g.font = F; g.fillStyle = col; g.textBaseline = "middle"; g.fillText(text, 20, h / 2 + 6);
    return { src: c.toDataURL("image/png"), ar: c.height / c.width };
}
function addText() {
    const { src, ar } = textPic("milk", "#E07A9A"), key = "t:" + uid(); imgAdd(key, src);
    IMG.get(key).ready.then(() => { pieceAdd(key, ar, { text: "milk", col: "#E07A9A", s: W * .3 }); setTimeout(() => $("txtIn").select(), 50); });
}
function retext() {
    const it = selItem(); if (!it || it.text == null) return;
    const { src, ar } = textPic(it.text, it.col), key = "t:" + uid(); imgAdd(key, src);
    IMG.get(key).ready.then(() => { it.img = key; it.ar = ar; psDraw(); clearTimeout(retext.t); retext.t = setTimeout(psCommit, 500); psChanged(true); });
}

// ---------------------------------------------------------------- the panels follow the work
const BGS = ["#FFF7F0", "#FFFFFF", "#FCE8EE", "#E6F4EE", "#EAF0FA", "#FFF3C4", "#F3E8FF", "#3E3A36", null];
function bgRow() {
    $("bgRow").innerHTML = BGS.map(c => `<button class="sw${c ? "" : " none"}${c === PS.bg ? " on" : ""}" data-bg="${c || ""}" style="${c ? "background:" + c : ""}" aria-label="${c ? "พื้น " + c : "พื้นใส"}"></button>`).join("")
        + `<button class="sw${PS.bg && !BGS.includes(PS.bg) ? " on" : ""}" style="background:conic-gradient(#F7B9CB,#F8D57E,#B9E3D2,#A7BFDF,#C9B8EC,#F7B9CB)" aria-label="เลือกสีเอง"><input type="color" id="bgPick" value="${PS.bg || "#ffffff"}"></button>`;
}
function layList() {
    const L = $("layList"); $("layN").textContent = PS.items.length || "";
    if (!PS.items.length) { L.innerHTML = '<div class="empty">ยังไม่มีชิ้น — ＋ เพิ่มรูป หรือ 🍓 สติ๊กเกอร์</div>'; return; }
    L.innerHTML = PS.items.slice().reverse().map(it => {
        const nm = it.text != null ? "“" + it.text + "”" : it.name || STK_NAME[it.img.slice(3)] || "รูป";
        return `<button data-id="${it.id}" class="${it.id === PS.sel ? "on" : ""}"><img src="${IMG.get(it.img)?.src || ""}" alt="">${nm.replace(/</g, "&lt;")}</button>`;
    }).join("");
}
function propCard() {
    const it = selItem(); $("propCard").hidden = !it;
    for (const id of ["toolDup", "toolDel"]) $(id).disabled = !it;
    if (!it) return;
    $("szIn").value = Math.round(it.s); $("rotIn").value = Math.round(it.r);
    $("propText").hidden = it.text == null;
    if (it.text != null) { if (document.activeElement !== $("txtIn")) $("txtIn").value = it.text; $("txtCol").value = it.col; }
}
psChanged = (light) => {   // light = while dragging: only the numbers
    propCard(); if (light) return;
    layList(); bgRow();
    document.querySelectorAll("#repRow button").forEach(b => b.classList.toggle("on", b.dataset.rep === PS.rep));
    $("undoBtn").disabled = !UNDO.past.length; $("redoBtn").disabled = !UNDO.future.length;
    const H = { place: PS.items.length || PS.base || PS.strokes.length || PS.photo ? "" : "＋ เพิ่มรูป · 🍓 สติ๊กเกอร์ · หรือลากรูปมาวาง", draw: "ลากบนแผ่นเพื่อวาด — เลยขอบได้ โผล่อีกฝั่ง", photo: PS.photo ? "ลากเพื่อเลื่อนรูป · ล้อเมาส์ = ย่อขยาย" : "เลือกรูปพื้นผิว (ผ้า ไม้ กระดาษ…) หรือลากรูปมาวาง" }[PS.mode] || "";
    $("hint").textContent = H; $("hint").hidden = !H;
};

// ---------------------------------------------------------------- wiring
function stkOpen() {
    const P = $("stkPop");
    if (!P.hidden) { P.hidden = true; return; }
    $("stkGrid").innerHTML = Object.keys(STK).map(k => `<button data-k="${k}" aria-label="${STK_NAME[k]}"><img src="${IMG.get("st:" + k).src}" alt=""></button>`).join("");
    const r = $("toolStk").getBoundingClientRect(); P.hidden = false; P.style.left = (r.right + 12) + "px"; P.style.top = Math.min(r.top, innerHeight - P.offsetHeight - 12) + "px";
}
function wire() {
    ED.cv = $("ed"); ED.g = ED.cv.getContext("2d");
    ED.cv.addEventListener("pointerdown", edDown); ED.cv.addEventListener("pointermove", edMove);
    ED.cv.addEventListener("pointerup", edUp); ED.cv.addEventListener("pointercancel", edUp);
    ED.cv.addEventListener("wheel", edWheel, { passive: false });
    addEventListener("keydown", edKey);
    new ResizeObserver(() => { edLayout(); psDraw(); }).observe($("work"));
    $("toolAdd").onclick = () => $("fileIn").click();
    $("fileIn").onchange = e => { addFiles([...e.target.files]); e.target.value = ""; };
    $("toolStk").onclick = stkOpen;
    $("stkGrid").onclick = e => { const b = e.target.closest("[data-k]"); if (b) { const k = b.dataset.k; pieceAdd("st:" + k, 1, { s: W * .2 }); $("stkPop").hidden = true; } };
    document.addEventListener("pointerdown", e => { if (!e.target.closest("#stkPop, #toolStk")) $("stkPop").hidden = true; });
    $("toolText").onclick = addText;
    $("toolDup").onclick = pieceDup; $("toolDel").onclick = pieceDel; $("toolScatter").onclick = scatter;
    $("toolSel").onclick = () => { PS.sel = null; psChanged(); psDraw(); };
    $("undoBtn").onclick = psUndo; $("redoBtn").onclick = psRedo;
    document.querySelectorAll(".modes button").forEach(b => b.onclick = () => { setMode(b.dataset.mode); });
    $("repRow").onclick = e => { const b = e.target.closest("[data-rep]"); if (!b) return; PS.rep = b.dataset.rep; PS.items.forEach(wrapIn); PS.selOff = [0, 0]; psCommit(); psDraw(); };
    $("bgRow").onclick = e => { const b = e.target.closest("[data-bg]"); if (!b) return; PS.bg = b.dataset.bg || null; psCommit(); psDraw(); };
    $("bgRow").addEventListener("input", e => { if (e.target.id === "bgPick") { PS.bg = e.target.value; psDraw(); } });
    $("bgRow").addEventListener("change", e => { if (e.target.id === "bgPick") psCommit(); });
    $("layList").onclick = e => { const b = e.target.closest("[data-id]"); if (b) { PS.sel = b.dataset.id; PS.selOff = [0, 0]; psChanged(); psDraw(); } };
    $("szIn").oninput = e => { const it = selItem(); if (it) { it.s = +e.target.value; psDraw(); } };
    $("rotIn").oninput = e => { const it = selItem(); if (it) { it.r = +e.target.value; psDraw(); } };
    $("szIn").onchange = $("rotIn").onchange = () => psCommit();
    $("flipBtn").onclick = () => { const it = selItem(); if (it) { it.fx = !it.fx; psCommit(); psDraw(); } };
    $("upBtn").onclick = () => moveLayer(1); $("downBtn").onclick = () => moveLayer(-1);
    $("txtIn").oninput = e => { const it = selItem(); if (it) { it.text = e.target.value; retext(); } };
    $("txtCol").oninput = e => { const it = selItem(); if (it) { it.col = e.target.value; retext(); } };
    $("pvZoom").oninput = e => { PV.zoom = +e.target.value; psDraw(); };
    // drop pictures anywhere · paste
    const wk = $("work");
    addEventListener("dragover", e => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); wk.classList.add("drop"); } });
    addEventListener("dragleave", e => { if (!e.relatedTarget) wk.classList.remove("drop"); });
    addEventListener("drop", e => { e.preventDefault(); wk.classList.remove("drop"); addFiles([...e.dataTransfer.files]); });
    addEventListener("paste", e => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); addFiles(f); } });
}
function moveLayer(d) {
    const i = PS.items.findIndex(x => x.id === PS.sel), j = i + d; if (i < 0 || j < 0 || j >= PS.items.length) return;
    [PS.items[i], PS.items[j]] = [PS.items[j], PS.items[i]]; psCommit(); psDraw();
}

(async () => {
    wire();
    await psLoad();
    UNDO.cur = workJSON();
    edLayout(); setMode("place");
    document.fonts?.ready.then(() => psDraw());
})();
