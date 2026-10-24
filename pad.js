/* the pad: a tiny sketchpad. strokes are kept on this device only. */
(function () {
    "use strict";
    window.ddPadInit = function () {
        const cv = document.getElementById("pad-canvas"); if (!cv || cv.dataset.on) return; cv.dataset.on = "1";
        const wrap = cv.parentElement, g = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), cleanup = window.__ddCleanup;
        const KEY = "dd-pad", BG = "#050505";
        let strokes = [], cur = null, tool = "pencil", color = "#e5e5e5", size = 3, w = 0, h = 0;
        try { strokes = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
        const accent = () => (getComputedStyle(document.documentElement).getPropertyValue("--dd-accent-text").trim() || "#bdbdbd");
        const colorOf = (s) => s.c === "accent" ? accent() : s.c;
        const save = () => { try { localStorage.setItem(KEY, JSON.stringify(strokes.slice(-400))); } catch {} };
        function drawStroke(s) {
            g.lineCap = g.lineJoin = "round"; g.strokeStyle = s.e ? BG : colorOf(s); const p = s.p;
            if (p.length === 1) { g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(p[0][0] * w, p[0][1] * h, s.w * (0.4 + p[0][2]) / 2, 0, 6.2832); g.fill(); return; }
            for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i]; g.lineWidth = s.w * (0.4 + (a[2] + b[2]) / 2); g.beginPath(); g.moveTo(a[0] * w, a[1] * h); g.lineTo(b[0] * w, b[1] * h); g.stroke(); }
        }
        const redraw = () => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, w, h); strokes.forEach(drawStroke); };
        const resize = () => { const r = wrap.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; redraw(); };
        const ro = new ResizeObserver(resize); ro.observe(wrap); resize();
        const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, e.pointerType === "pen" ? Math.min(1, e.pressure * 1.4 || 0.5) : 0.6]; };
        cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); cur = { c: tool === "eraser" ? "#050505" : color, e: tool === "eraser", w: tool === "eraser" ? size * 2.5 : size * 1.4, p: [pos(e)] }; strokes.push(cur); drawStroke(cur); });
        cv.addEventListener("pointermove", (e) => { if (!cur) return; const n = pos(e), l = cur.p[cur.p.length - 1]; if (Math.hypot((n[0] - l[0]) * w, (n[1] - l[1]) * h) < 1.5) return; cur.p.push(n); const t = { ...cur, p: cur.p.slice(-2) }; drawStroke(t); });
        const end = () => { if (cur) { cur = null; save(); } };
        cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
        const tools = Array.from(document.querySelectorAll("[data-tool]")), cols = Array.from(document.querySelectorAll("[data-c]"));
        tools.forEach((b) => b.addEventListener("click", () => { tool = b.dataset.tool; tools.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
        cols.forEach((b) => b.addEventListener("click", () => { color = b.dataset.c; tool = "pencil"; cols.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); tools.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.tool === "pencil"))); }));
        document.getElementById("pad-size").addEventListener("input", (e) => { size = +e.target.value; });
        const undo = () => { strokes.pop(); save(); redraw(); };
        document.getElementById("pad-undo").addEventListener("click", undo);
        document.getElementById("pad-clear").addEventListener("click", () => { if (strokes.length && confirm("clear the whole sketch?")) { strokes = []; save(); redraw(); } });
        document.getElementById("pad-save").addEventListener("click", () => cv.toBlob((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sketch.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }));
        const onKey = (e) => { if (e.key.toLowerCase() === "z" && !e.ctrlKey && !e.metaKey && !/input|textarea|select/i.test(e.target.tagName)) undo(); };
        document.addEventListener("keydown", onKey);
        cleanup.push(() => { ro.disconnect(); document.removeEventListener("keydown", onKey); });
    };
})();
