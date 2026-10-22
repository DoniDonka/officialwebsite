/* the lab: three looks drawn from the real audio analyser. loaded only when the lab page is open. */
(function () {
    "use strict";
    window.ddLabInit = function () {
        const cv = document.getElementById("lab-canvas"), wrap = document.getElementById("lab"), hint = document.getElementById("lab-hint");
        if (!cv || !wrap || cv.dataset.on) return; cv.dataset.on = "1";
        const g = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2), cleanup = window.__ddCleanup;
        const less = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion");
        let w = 0, h = 0, raf = 0, mx = 0, my = 0, boost = 0, mode = "bars", lastHint = "";
        try { mode = localStorage.getItem("dd-lab-mode") || "bars"; } catch {}
        const stars = Array.from({ length: 170 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
        const resize = () => { const r = wrap.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); if (less()) frame(); };
        const ro = new ResizeObserver(resize); ro.observe(wrap);
        const buttons = Array.from(document.querySelectorAll("[data-mode]"));
        const setMode = (m) => { mode = m; try { localStorage.setItem("dd-lab-mode", m); } catch {} buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m))); g.clearRect(0, 0, w, h); if (less()) frame(); };
        buttons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
        const full = document.getElementById("lab-full");
        const goFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => {}); };
        if (full) full.addEventListener("click", goFull);
        const onKey = (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
            if (e.key === "1") setMode("bars"); else if (e.key === "2") setMode("rings"); else if (e.key === "3") setMode("warp"); else if (e.key.toLowerCase() === "f") goFull();
        };
        document.addEventListener("keydown", onKey);
        wrap.addEventListener("pointermove", (e) => { const r = wrap.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width * 2 - 1; my = (e.clientY - r.top) / r.height * 2 - 1; });
        wrap.addEventListener("pointerdown", () => { boost = 1; });
        const say = (t) => { if (t !== lastHint) { hint.textContent = t; lastHint = t; } };
        const avg = (d, a, b) => { let s = 0; for (let i = a; i < b; i++) s += d[i]; return s / (b - a) / 255; };

        function frame() {
            const an = window.ddAnalyser, live = an && !document.querySelector("audio").paused;
            let d = null; if (an) { d = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(d); }
            say(!an ? "press play, or click anywhere, so the audio can be read." : !live ? "paused. press play (or k) to see it move." : "");
            const bass = d ? avg(d, 1, 6) : 0;
            g.fillStyle = "rgba(4,4,4,.32)"; g.fillRect(0, 0, w, h);
            if (mode === "bars") {
                const n = 64, half = n / 2, bw = w / n;   // low notes in the middle, highs toward the edges
                for (let i = 0; i < half; i++) {
                    const bi = Math.min(110, Math.floor(Math.pow(i / half, 1.8) * 90) + 1), v = d ? Math.min(1, Math.pow(d[bi] / 255, 0.9) * 1.15) : 0.02, bh = Math.max(2, v * h * 0.85), c = 110 + Math.round(v * 140);
                    g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect((half + i) * bw + 1, (h - bh) / 2, bw - 2, bh); g.fillRect((half - 1 - i) * bw + 1, (h - bh) / 2, bw - 2, bh);
                }
            } else if (mode === "rings") {
                const cx = w / 2, cy = h / 2, base = Math.min(w, h) / 26;
                for (let i = 0; i < 12; i++) { const v = d ? d[i * 3 + 1] / 255 : 0; g.beginPath(); g.arc(cx, cy, (i + 1) * base + v * 26, 0, 6.2832);
                    g.strokeStyle = `rgba(210,210,210,${0.12 + v * 0.6})`; g.lineWidth = 1 + v * 2; g.stroke(); }
            } else {
                const cx = w / 2 + mx * w * 0.08, cy = h / 2 + my * h * 0.08, speed = 0.004 + bass * 0.03 + boost * 0.05; boost *= 0.94;
                stars.forEach((s) => {
                    const pz = s.z; s.z -= speed; if (s.z <= 0.02) { s.x = Math.random() * 2 - 1; s.y = Math.random() * 2 - 1; s.z = 1; return; }
                    const x1 = cx + s.x / s.z * w * 0.3, y1 = cy + s.y / s.z * h * 0.3, x0 = cx + s.x / pz * w * 0.3, y0 = cy + s.y / pz * h * 0.3;
                    g.strokeStyle = `rgba(220,220,220,${Math.min(1, (1 - s.z) * 1.4)})`; g.lineWidth = Math.max(0.5, (1 - s.z) * 2); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
                });
            }
            if (!less()) raf = requestAnimationFrame(frame);
        }
        const onVis = () => { if (!document.hidden && !less()) { cancelAnimationFrame(raf); frame(); } };
        document.addEventListener("visibilitychange", onVis);
        setMode(mode); resize(); frame();
        if (less()) say("motion is turned off, so this is a still frame.");
        cleanup.push(() => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis); });
    };
})();
