// ===== 🖼️ from a picture (mode "photo", user 2026-10-28): a photo of a texture (fabric, wood, paper, grass…) made into a tile that joins up.
// PS.photo {img (a picture key), z (zoom ≥ 1), cx, cy (the square crop's centre, 0–1 of the picture), b (how wide the blend at the joins, 0.1–0.9)}
// or null — drawn right after the ground (02-render drawTile), under ▦ / pieces / strokes. How it joins up (photoTile): the crop is laid over a copy
// of itself moved half a tile across, the copy showing only near the left / right edges (where it carries on from the other side — its own
// break is in the middle, hidden); then the same up / down. Done with see-through masks on canvases (fast). It joins up in ต่อตรง and สะท้อน;
// half-drop / brick move a tile by half, so the photo would break there — the card says so. Not good for a single object (it gets doubled).
const PHT = { cache: new Map() };
function photoSrc() { return PS.photo && IMG.get(PS.photo.img)?.el; }
function photoTile(px) {
    const P = PS.photo, im = photoSrc(); px = Math.round(px);
    if (!P || !im || !im.naturalWidth) return null;
    const key = px + "|" + JSON.stringify(P); if (PHT.cache.has(key)) return PHT.cache.get(key);
    const w = im.naturalWidth, h = im.naturalHeight, side = Math.min(w, h) / Math.max(1, P.z);
    const sx = Math.max(0, Math.min(w - side, P.cx * w - side / 2)), sy = Math.max(0, Math.min(h - side, P.cy * h - side / 2));
    const mk = () => Object.assign(document.createElement("canvas"), { width: px, height: px });
    const A = mk(), ag = A.getContext("2d"); ag.imageSmoothingQuality = "high"; ag.drawImage(im, sx, sy, side, side, 0, 0, px, px);
    const B = mk(), bg = B.getContext("2d"), b = Math.max(.1, Math.min(.9, P.b));
    for (const horiz of [true, false]) {
        bg.globalCompositeOperation = "source-over"; bg.clearRect(0, 0, px, px);
        if (horiz) { bg.drawImage(A, px / 2, 0); bg.drawImage(A, -px / 2, 0); } else { bg.drawImage(A, 0, px / 2); bg.drawImage(A, 0, -px / 2); }
        const gr = horiz ? bg.createLinearGradient(0, 0, px, 0) : bg.createLinearGradient(0, 0, 0, px);
        for (let i = 0; i <= 8; i++) {   // (a smooth step: the copy fully there at the edge, gone b / 2 in)
            const t = i / 8, a = 1 - t * t * (3 - 2 * t);
            gr.addColorStop(t * b / 2, `rgba(0,0,0,${a})`); gr.addColorStop(1 - t * b / 2, `rgba(0,0,0,${a})`);
        }
        bg.globalCompositeOperation = "destination-in"; bg.fillStyle = gr; bg.fillRect(0, 0, px, px);
        ag.drawImage(B, 0, 0);
    }
    PHT.cache.set(key, A); if (PHT.cache.size > 3) PHT.cache.delete(PHT.cache.keys().next().value);
    return A;
}
function drawPhoto(g, opts = {}) {
    if (!PS.photo || opts.solid) return;
    const t = photoTile(Math.max(1, g.getTransform().a * W)); if (t) g.drawImage(t, 0, 0, W, W);
}
async function photoFromFile(f) {
    try {
        const { src } = await imgFromFile(f, 3000), key = "u:" + uid(); imgAdd(key, src); await IMG.get(key).ready;
        PS.photo = Object.assign({ z: 1, cx: .5, cy: .5, b: .5 }, PS.photo || {}, { img: key }); PS.photo.cx = PS.photo.cy = .5;
        psCommit(); psDraw(); toast("ลากบนแผ่นเพื่อเลื่อนรูป · ล้อเมาส์ = ย่อขยาย");
    } catch (e) { toast("เปิดรูปนี้ไม่ได้"); }
}

// ---------------------------------------------------------------- moving the crop on the mat (photo mode)
const PHD = {};
function phDown(e) {
    if (PS.mode !== "photo" || !PS.photo) return;
    ED.cv.setPointerCapture(e.pointerId);
    Object.assign(PHD, { id: e.pointerId, x: e.clientX, y: e.clientY, cx: PS.photo.cx, cy: PS.photo.cy });
}
function phMove(e) {
    if (PHD.id !== e.pointerId || !PS.photo) return;
    const im = photoSrc(); if (!im) return;
    const side = Math.min(im.naturalWidth, im.naturalHeight) / PS.photo.z, k = side / ED.T;   // (picture px per screen px)
    PS.photo.cx = Math.max(0, Math.min(1, PHD.cx - (e.clientX - PHD.x) * k / im.naturalWidth));
    PS.photo.cy = Math.max(0, Math.min(1, PHD.cy - (e.clientY - PHD.y) * k / im.naturalHeight));
    phClamp(); psDraw();
}
function phUp(e) { if (PHD.id !== e.pointerId) return; PHD.id = null; psCommit(); }
function phClamp() {   // (the crop stays on the picture)
    const P = PS.photo, im = photoSrc(); if (!P || !im) return;
    const fx = Math.min(1, Math.min(im.naturalWidth, im.naturalHeight) / P.z / im.naturalWidth) / 2, fy = Math.min(1, Math.min(im.naturalWidth, im.naturalHeight) / P.z / im.naturalHeight) / 2;
    P.cx = Math.max(fx, Math.min(1 - fx, P.cx)); P.cy = Math.max(fy, Math.min(1 - fy, P.cy));
}
let phWheelT = 0;
function phWheel(e) {
    if (PS.mode !== "photo" || !PS.photo) return;
    e.preventDefault(); PS.photo.z = Math.max(1, Math.min(6, PS.photo.z * Math.pow(1.0015, -e.deltaY))); phClamp(); phCard(); psDraw();
    clearTimeout(phWheelT); phWheelT = setTimeout(psCommit, 300);
}

// ---------------------------------------------------------------- the card
function phCard() {
    const P = PS.photo; $("phOpts").hidden = !P;
    $("phWarn").hidden = !P || PS.rep === "grid" || PS.rep === "mirror";
    if (!P) return;
    $("phZ").value = Math.round(P.z * 100); $("phB").value = Math.round(P.b * 100);
    $("phThumb").src = IMG.get(P.img)?.src || "";
}
(() => {
    $("ed").addEventListener("pointerdown", phDown); $("ed").addEventListener("pointermove", phMove);
    $("ed").addEventListener("pointerup", phUp); $("ed").addEventListener("pointercancel", phUp);
    $("ed").addEventListener("wheel", phWheel, { passive: false });
    $("phAdd").onclick = () => $("phFile").click();
    $("phFile").onchange = e => { if (e.target.files[0]) photoFromFile(e.target.files[0]); e.target.value = ""; };
    $("phZ").oninput = e => { PS.photo.z = +e.target.value / 100; phClamp(); psDraw(); }; $("phZ").onchange = () => psCommit();
    $("phB").oninput = e => { PS.photo.b = +e.target.value / 100; psDraw(); }; $("phB").onchange = () => psCommit();
    $("phDel").onclick = () => { PS.photo = null; psCommit(); psDraw(); };
    const _c = psChanged; psChanged = light => { _c(light); if (!light) phCard(); };
})();
