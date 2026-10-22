/* extras: plain js, no libraries. ddInitFx re-runs after page swaps; the player bits only bind once. */
(function () {
    "use strict";
    const prefersLess = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
                    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

    window.ddToast = (title, msg, ms = 4500, href) => {
        let box = document.querySelector(".dd-toasts");
        if (!box) { box = document.createElement("div"); box.className = "dd-toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
        const t = document.createElement("div"); t.className = "dd-toast"; t.innerHTML = "<strong></strong><span></span>";
        t.style.setProperty("--dur", ms + "ms"); t.firstChild.textContent = title; t.lastChild.textContent = msg; if (href) { const a = document.createElement("a"); a.className = "dd-toast-link"; a.href = href; a.textContent = "open →"; t.appendChild(a); } box.appendChild(t);
        setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 300); }, ms);
    };
    if (navigator.connection && navigator.connection.saveData) document.documentElement.classList.add("dd-lite");
    document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("dd-paused", document.hidden));
    const shootLoop = () => {
        const wait = 14000 + Math.random() * 18000;
        setTimeout(() => {
            if (!document.hidden && !prefersLess() && !document.documentElement.classList.contains("user-reduced-motion") && !document.documentElement.classList.contains("dd-lite")) {
                const el = document.createElement("div"); el.className = "dd-shoot"; document.body.appendChild(el);
                const x = Math.random() * innerWidth * .6, y = Math.random() * innerHeight * .4;
                el.animate([{ transform: `translate(${x}px,${y}px) rotate(28deg)`, opacity: 0 }, { opacity: .8, offset: .2 }, { transform: `translate(${x + 420}px,${y + 222}px) rotate(28deg)`, opacity: 0 }], { duration: 1100, easing: "ease-out" }).onfinish = () => el.remove();
            }
            shootLoop();
        }, wait);
    };
    setTimeout(shootLoop, 0);

    function stars() {
        if (document.querySelector(".dd-stars")) return;
        const box = document.createElement("div"); box.className = "dd-stars"; box.setAttribute("aria-hidden", "true");
        [38, 22].forEach((n) => {
            const layer = document.createElement("i"), dots = [];
            for (let k = 0; k < n; k++) dots.push(`${Math.random() * 100}vw ${Math.random() * 100}vh 0 0 #bdbdbd`);
            layer.style.boxShadow = dots.join(","); box.appendChild(layer);
        });
        const glow = document.createElement("div"); glow.className = "dd-glow"; box.append(glow);
        document.body.prepend(box);
    }

    function player() {
        const p = document.querySelector(".music-player-global"), audio = document.getElementById("background-audio");
        if (!p || !audio || p.dataset.fx) return; p.dataset.fx = "1";
        const mini = document.createElement("button"); mini.type = "button"; mini.className = "music-mini-toggle";
        const mute = document.createElement("button"); mute.type = "button"; mute.className = "music-mute-toggle";
        const setMini = (on) => { p.classList.toggle("is-mini", on); mini.textContent = on ? "+" : "–";
            mini.setAttribute("aria-label", on ? "expand music player" : "minimise music player"); mini.setAttribute("aria-expanded", String(!on)); };
        const setMute = () => { mute.textContent = audio.muted ? "muted" : "mute"; mute.setAttribute("aria-label", audio.muted ? "unmute music" : "mute music"); mute.setAttribute("aria-pressed", String(audio.muted)); };
        const saved = store.get("dd-player-mini");
        setMini(saved === null ? innerHeight < 700 : saved === "1");
        mini.addEventListener("click", () => { const on = !p.classList.contains("is-mini"); setMini(on); store.set("dd-player-mini", on ? "1" : "0"); });
        mute.addEventListener("click", () => { audio.muted = !audio.muted; setMute(); });
        audio.addEventListener("volumechange", setMute); setMute();
        const loop = document.createElement("button"); loop.type = "button"; loop.className = "music-loop-toggle"; loop.textContent = "loop";
        const setLoop = (on) => { audio.loop = on; loop.setAttribute("aria-pressed", String(on)); loop.setAttribute("aria-label", on ? "loop is on, turn off" : "loop is off, turn on"); };
        setLoop(store.get("dd-music-loop") !== "0");
        loop.addEventListener("click", () => { setLoop(!audio.loop); store.set("dd-music-loop", audio.loop ? "1" : "0"); });
        window.ddPlayerApi = { setMini, setLoop };
        p.append(loop, mute, mini);
        // equalizer driven by the real audio. only wired up after a user gesture, so it can never silence the music.
        const cv = document.createElement("canvas"); cv.className = "music-eq"; cv.width = 44; cv.height = 18; cv.setAttribute("aria-hidden", "true");
        const playBtn = p.querySelector("button"); if (playBtn) playBtn.after(cv); else p.prepend(cv);
        const g = cv.getContext("2d"); let an = null, bins = null, raf = 0, wired = false;
        const draw = () => {
            cancelAnimationFrame(raf); g.clearRect(0, 0, 44, 18); if (an) an.getByteFrequencyData(bins);
            const live = an && !audio.paused && !prefersLess() && !document.documentElement.classList.contains("user-reduced-motion");
            for (let i = 0; i < 8; i++) { const h = Math.max(2, (live ? bins[i * 3 + 1] / 255 : 0.1) * 18); g.fillStyle = "#bdbdbd"; g.fillRect(i * 5.5, 18 - h, 3, h); }
            if (live && !document.hidden) raf = requestAnimationFrame(draw);
        };
        const wire = async () => {
            if (wired) return; wired = true;
            try {
                const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
                const ac = new AC(); await ac.resume();
                if (ac.state !== "running") { wired = false; ac.close(); return; }
                const src = ac.createMediaElementSource(audio); an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.8;
                src.connect(an); an.connect(ac.destination); bins = new Uint8Array(an.frequencyBinCount); window.ddAnalyser = an; cv.dataset.live = "1"; draw();
            } catch { wired = false; }
        };
        ["click", "keydown", "touchend"].forEach((ev) => document.addEventListener(ev, wire));
        audio.addEventListener("play", draw); audio.addEventListener("pause", draw); document.addEventListener("visibilitychange", draw); draw();
        document.addEventListener("keydown", (e) => {   // "k" plays/pauses
            if (e.key.toLowerCase() !== "k" || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
            audio.paused ? audio.play().catch(() => {}) : audio.pause();
        });
        if ("mediaSession" in navigator) {   // media keys + lock screen
            navigator.mediaSession.metadata = new MediaMetadata({ title: "moog city", artist: "slowed + reverb", album: "donidonka.info", artwork: [{ src: "assets/profile-rifle.png", sizes: "320x320", type: "image/png" }] });
            [["play", () => audio.play()], ["pause", () => audio.pause()], ["seekto", (d) => { audio.currentTime = d.seekTime; }]].forEach(([a, f]) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} });
        }
        const tag = () => { const t = document.title.replace(/^♪ /, ""); document.title = audio.paused ? t : "♪ " + t; };
        audio.addEventListener("play", tag); audio.addEventListener("pause", tag);
        // listening time for the stats page (counted on this device only)
        let lastT = null, acc = parseFloat(store.get("dd-listen") || "0"), lastSave = 0; window.ddListenSeconds = () => acc;
        audio.addEventListener("timeupdate", () => { const t = audio.currentTime; if (lastT !== null) { const d = t - lastT; if (d > 0 && d < 1.5) acc += d; } lastT = t; if (Date.now() - lastSave > 5000) { lastSave = Date.now(); store.set("dd-listen", String(acc)); } });
        audio.addEventListener("pause", () => { lastT = null; store.set("dd-listen", String(acc)); });
        setTimeout(() => { if (audio.paused && playBtn) playBtn.classList.add("is-attn"); }, 2400);
        audio.addEventListener("play", () => playBtn && playBtn.classList.remove("is-attn"));
        setTimeout(() => { if (audio.paused && !sessionStorage.getItem("dd-music-toast")) { try { sessionStorage.setItem("dd-music-toast", "1"); } catch {} window.ddToast("music is paused", "your browser blocks autoplay with sound. press play on the player to start it."); } }, 2400);
        audio.addEventListener("error", () => { const s = document.getElementById("music-status"); if (s) { s.textContent = "couldn't load the music file"; s.classList.add("music-error"); } });
        document.addEventListener("keydown", (e) => {   // "m" mutes, unless you're typing
            if (e.key.toLowerCase() !== "m" || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
            audio.muted = !audio.muted; setMute();
        });
    }

    async function whatsNew() {
        const link = document.querySelector('.main-nav a[href="updates.html"]'); if (!link) return;
        const onPage = /updates\.html$/.test(location.pathname), key = "dd-seen-updates", seen = parseInt(store.get(key) || "0", 10);
        let count = 0;
        try { count = onPage ? document.querySelectorAll(".update-item").length : ((await (await fetch("updates.html")).text()).match(/class="update-item"/g) || []).length; } catch { return; }
        if (onPage || !seen) { if (count) store.set(key, String(count)); return; }
        link.classList.toggle("has-new", count > seen);
    }

    // lightbox extras (the viewer is built in script.js): click image to zoom, swipe to change image
    let touchX = null;
    document.addEventListener("click", (e) => {
        const box = e.target.closest && e.target.closest(".image-lightbox"); if (!box) return;
        if (e.target.matches("img")) box.classList.toggle("is-zoomed"); else if (e.target.matches(".lightbox-prev, .lightbox-next")) box.classList.remove("is-zoomed");
    });
    document.addEventListener("close", (e) => e.target.classList && e.target.classList.remove("is-zoomed"), true);
    document.addEventListener("touchstart", (e) => { touchX = e.target.closest(".image-lightbox") ? e.touches[0].clientX : null; }, { passive: true });
    document.addEventListener("touchend", (e) => {
        if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; touchX = null;
        const box = document.querySelector(".image-lightbox[open]"); if (box && Math.abs(dx) > 50) box.querySelector(dx < 0 ? ".lightbox-next" : ".lightbox-prev").click();
    }, { passive: true });

    // pointer parallax: the watermark leans a few px away from the cursor (fine pointers only)
    let ptTick = false;
    if (matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", (e) => {
        if (ptTick || prefersLess() || document.documentElement.classList.contains("user-reduced-motion")) return; ptTick = true;
        requestAnimationFrame(() => { const r = document.documentElement.style; r.setProperty("--mx", ((e.clientX / innerWidth - .5) * -14).toFixed(1) + "px"); r.setProperty("--my", ((e.clientY / innerHeight - .5) * -14).toFixed(1) + "px"); ptTick = false; });
    }, { passive: true });

    document.addEventListener("pointerdown", (e) => {
        const host = e.target.closest && e.target.closest(".primary-action, .secondary-action, .project-filter, .project-sort, .copy-btn");
        if (!host || prefersLess() || document.documentElement.classList.contains("user-reduced-motion")) return;
        host.classList.add("dd-ripple-host");
        const r = host.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement("span");
        s.className = "dd-ripple"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
        host.appendChild(s); setTimeout(() => s.remove(), 600);
    });

    function anchorsAndPager() {
        const used = new Set(Array.from(document.querySelectorAll("[id]")).map((n) => n.id));
        document.querySelectorAll("main h2").forEach((h) => {
            if (h.closest("a") || h.querySelector(".anchor-btn")) return;
            if (!h.id) { let base = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section", id = base, n = 2; while (used.has(id)) id = base + "-" + n++; h.id = id; used.add(id); }
            const b = document.createElement("button"); b.type = "button"; b.className = "anchor-btn"; b.textContent = "#"; b.setAttribute("aria-label", "copy link to this section");
            b.addEventListener("click", async () => { const url = location.origin + location.pathname + "#" + h.id;
                try { await navigator.clipboard.writeText(url); window.ddToast("link copied", url, 2500); } catch { window.ddToast("couldn't copy", "your browser blocked it.", 3000); } });
            h.appendChild(b);
        });
        const main = document.querySelector("main"), links = Array.from(document.querySelectorAll(".main-nav a")), here = links.findIndex((a) => new URL(a.href).pathname === location.pathname);
        if (!main || here < 1 || main.querySelector(".page-pager")) return;   // skip the homepage and pages that aren't in the nav
        const nav = document.createElement("nav"); nav.className = "page-pager"; nav.setAttribute("aria-label", "previous and next page");
        const mk = (a, rel, arrow) => { const l = document.createElement("a"); l.href = a.getAttribute("href"); l.rel = rel; l.textContent = rel === "prev" ? "← " + a.textContent.trim() : a.textContent.trim() + " →"; return l; };
        if (here > 0) nav.appendChild(mk(links[here - 1], "prev"));
        if (here < links.length - 1) nav.appendChild(mk(links[here + 1], "next"));
        main.appendChild(nav);
    }

    // ---- hidden pages: how they're found, and what they need ----
    const SECRETS = { lab: { name: "the lab", href: "lab.html" }, colophon: { name: "colophon", href: "colophon.html" }, stats: { name: "your stats", href: "stats.html" } };
    const KONAMI = "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a";
    const found = () => { try { return JSON.parse(store.get("dd-secrets") || "[]"); } catch { return []; } };
    const keyBuf = [], clicks = [];
    window.ddOpen = (href) => { const a = document.createElement("a"); a.href = href; document.body.appendChild(a); a.click(); a.remove(); };
    function renderSecretLinks() {
        const nav = document.querySelector(".footer-links"); if (!nav) return;
        nav.querySelectorAll(".secret-link").forEach((a) => a.remove());
        found().forEach((id) => { const s = SECRETS[id]; if (!s) return; const a = document.createElement("a"); a.className = "secret-link"; a.href = s.href; a.textContent = s.name; nav.appendChild(a); });
    }
    function unlock(id) {
        const s = SECRETS[id], list = found(); if (!s) return;
        if (list.includes(id)) { window.ddOpen(s.href); return; }
        list.push(id); store.set("dd-secrets", JSON.stringify(list)); renderSecretLinks();
        window.ddToast("hidden page found: " + s.name, "it's in the footer now, so you can come back.", 7000, s.href);
    }
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
        if (e.key === "?") { e.preventDefault(); window.ddOpen("keys.html"); return; }
        keyBuf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (keyBuf.length > 12) keyBuf.shift();
        if (keyBuf.join(",").endsWith(KONAMI)) unlock("lab"); else if (keyBuf.slice(-6).join("") === "pencil") unlock("colophon");
    });
    function track() {
        store.set("dd-views", String((parseInt(store.get("dd-views") || "0", 10) || 0) + 1));
        if (!store.get("dd-first")) store.set("dd-first", new Date().toISOString().slice(0, 10));
        if (!/contact\.html$/.test(location.pathname)) { try { sessionStorage.setItem("dd-last-real", location.pathname); } catch {} }
        try { if (!sessionStorage.getItem("dd-session-start")) sessionStorage.setItem("dd-session-start", String(Date.now())); } catch {}
    }
    function secretPages() {
        if (document.getElementById("lab-canvas")) {
            if (window.ddLabInit) window.ddLabInit();
            else if (!document.querySelector("script[data-lab]")) { const s = document.createElement("script"); s.src = "lab.js"; s.dataset.lab = "1"; s.onload = () => window.ddLabInit(); document.head.appendChild(s); }
        }
        if (document.getElementById("ticket-form")) {
            if (window.ddTicketInit) window.ddTicketInit();
            else if (!document.querySelector("script[data-ticket]")) { const s = document.createElement("script"); s.src = "ticket.js"; s.dataset.ticket = "1"; s.onload = () => window.ddTicketInit(); document.head.appendChild(s); }
        }
        const grid = document.querySelector(".stat-grid");
        if (grid && !grid.dataset.fx) {
            grid.dataset.fx = "1";
            const cell = (k) => grid.querySelector(`[data-stat="${k}"]`), fmt = (s) => s < 60 ? Math.floor(s) + "s" : Math.floor(s / 60) + "m " + Math.floor(s % 60) + "s";
            const countUp = (el, to) => { if (prefersLess() || !to) { el.textContent = String(to); return; } const t0 = performance.now(); const step = (t) => { const k = Math.min(1, (t - t0) / 700); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
            countUp(cell("visits"), parseInt(store.get("donidonka-site-visits-v1") || "0", 10) || 0); countUp(cell("views"), parseInt(store.get("dd-views") || "0", 10) || 0);
            cell("first").textContent = store.get("dd-first") || "–"; cell("secrets").textContent = found().length + " / " + Object.keys(SECRETS).length;
            const live = () => { const st = parseInt(sessionStorage.getItem("dd-session-start") || "0", 10), ls = window.ddListenSeconds ? window.ddListenSeconds() : parseFloat(store.get("dd-listen") || "0");
                cell("listen").textContent = fmt(ls); cell("session").textContent = st ? fmt((Date.now() - st) / 1000) : "–"; };
            live(); const timer = setInterval(live, 1000); window.__ddCleanup.push(() => clearInterval(timer));
            const reset = grid.parentElement.querySelector('[data-action="reset-stats"]');
            if (reset) reset.addEventListener("click", () => { ["dd-views", "dd-first", "dd-listen", "donidonka-site-visits-v1"].forEach((k) => { try { localStorage.removeItem(k); } catch {} });
                cell("visits").textContent = "0"; cell("views").textContent = "0"; cell("first").textContent = "–"; window.ddToast("stats reset", "counting starts again from now.", 3000); });
        }
        const clear = document.querySelector('[data-action="clear-all"]');
        if (clear && !clear.dataset.fx) { clear.dataset.fx = "1"; clear.addEventListener("click", () => {
            [localStorage, sessionStorage].forEach((st) => { try { Object.keys(st).filter((k) => /^(dd-|donidonka-)/.test(k)).forEach((k) => st.removeItem(k)); } catch {} });
            document.documentElement.classList.remove("high-contrast", "user-reduced-motion");
            const audio = document.getElementById("background-audio"), vol = document.getElementById("music-volume"); if (audio) { audio.volume = 0.3; audio.muted = false; } if (vol) vol.value = "30";
            if (window.ddPlayerApi) { window.ddPlayerApi.setMini(innerHeight < 700); window.ddPlayerApi.setLoop(true); } renderSecretLinks();
            window.ddToast("cleared", "everything this site stored on your device is gone.", 4000); }); }
    }

    function page() {
        const main = document.querySelector("main");
        if (main && !main.id) main.id = "main";
        if (main && !document.querySelector(".skip-link")) {
            const a = document.createElement("a"); a.className = "skip-link"; a.href = "#main"; a.textContent = "skip to content"; document.body.prepend(a);
        }
        document.querySelectorAll(".copy-box[data-copy]").forEach((box) => {
            if (box.querySelector(".copy-btn")) return;
            const btn = document.createElement("button"); btn.type = "button"; btn.className = "copy-btn"; btn.textContent = "copy"; btn.setAttribute("aria-label", "copy " + (box.querySelector(".copy-label") || {}).textContent);
            btn.addEventListener("click", async () => {
                try { await navigator.clipboard.writeText(box.dataset.copy); btn.textContent = "copied"; window.ddToast("copied", box.dataset.copy, 2200); }
                catch { btn.textContent = "press ctrl+c"; window.ddToast("couldn't copy", "your browser blocked it, so select the text and copy it yourself.", 3500); }
                setTimeout(() => { btn.textContent = "copy"; }, 1800);
            });
            box.append(btn);
        });
        const foot = document.querySelector(".site-footer");
        if (foot && !foot.querySelector(".footer-links")) {
            const nav = document.createElement("nav"); nav.className = "footer-links"; nav.setAttribute("aria-label", "footer links");
            [["github", "https://github.com/DoniDonka"], ["youtube", "https://www.youtube.com/@schoolinformer177"], ["roblox", "https://www.roblox.com/search/users?keyword=DoniDonka"], ["projects", "projects.html"], ["shortcuts", "keys.html"], ["report a problem", "contact.html?topic=bug"], ["feed", "feed.xml"]].forEach(([t, h]) => {
                const a = document.createElement("a"); a.textContent = t; a.href = h; if (h.startsWith("http") || h.endsWith(".xml")) { a.target = "_blank"; a.rel = "noopener noreferrer"; } nav.appendChild(a);
            });
            foot.appendChild(nav);
        }
        renderSecretLinks();
        const tt = document.title.replace(/^♪ /, ""), au = document.getElementById("background-audio"); document.title = au && !au.paused ? "♪ " + tt : tt;
        const av = document.querySelector(".avatar"), img = document.querySelector(".avatar-image");
        if (av && img && !av.dataset.fx) { av.dataset.fx = "1"; av.addEventListener("click", () => {
            img.classList.remove("is-kick"); void img.offsetWidth; img.classList.add("is-kick");
            const now = Date.now(); clicks.push(now); while (clicks.length && now - clicks[0] > 4000) clicks.shift(); if (clicks.length >= 7) { clicks.length = 0; unlock("stats"); }
        }); }
        const nf = document.querySelector(".not-found-links");
        if (nf && !document.querySelector(".not-found-path")) { const c = document.createElement("p"); c.className = "not-found-path"; c.textContent = "you asked for: " + location.pathname; nf.before(c); }
        whatsNew();
        // "/" jumps to project search
        const search = document.getElementById("project-search");
        if (search && !search.dataset.fx) { search.dataset.fx = "1";
            search.addEventListener("keydown", (e) => { if (e.key === "Escape" && search.value) { search.value = ""; search.dispatchEvent(new Event("input", { bubbles: true })); } });
            const onKey = (e) => { if (e.key === "/" && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); search.focus(); } };
            document.addEventListener("keydown", onKey); (window.__ddCleanup || []).push(() => document.removeEventListener("keydown", onKey)); }
    }

    // on the homepage the player sits inside an animated block, which breaks position:fixed. move it to the shell before anything binds to it.
    const shell = document.querySelector(".site-shell"), pl = document.querySelector(".music-player-global");
    if (shell && pl && pl.parentElement !== shell) shell.appendChild(pl);

    function projectsAndReset() {
        const grid = document.querySelector(".project-filter-grid"), sort = document.querySelector(".project-sort");
        if (grid && sort && !sort.dataset.fx) {
            sort.dataset.fx = "1"; Array.from(grid.children).forEach((c, i) => { c.dataset.i = i; });
            sort.addEventListener("click", () => {
                const az = sort.getAttribute("aria-pressed") !== "true";
                sort.setAttribute("aria-pressed", String(az)); sort.textContent = "sort: " + (az ? "a–z" : "default");
                const kids = Array.from(grid.children), before = new Map(kids.map((c) => [c, c.getBoundingClientRect()]));
                kids.sort((a, b) => az ? a.querySelector("h2").textContent.localeCompare(b.querySelector("h2").textContent) : a.dataset.i - b.dataset.i).forEach((c) => grid.appendChild(c));
                if (!prefersLess() && !document.documentElement.classList.contains("user-reduced-motion")) kids.forEach((c) => {
                    const a = before.get(c), b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
                    if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.7,.2,1)" });
                });
            });
        }
        const buttons = Array.from(document.querySelectorAll("[data-project-filter]"));
        buttons.forEach((btn) => btn.addEventListener("click", () => {
            const v = btn.dataset.projectFilter; history.replaceState(history.state, "", v === "all" ? location.pathname : "#" + v);
        }));
        const want = decodeURIComponent(location.hash.slice(1));
        const hit = buttons.find((btn) => btn.dataset.projectFilter === want && want !== "all");
        if (hit) hit.click();

        const note = document.querySelector(".footer-note");
        if (note && !note.querySelector(".reset-settings")) {
            const b = document.createElement("button"); b.type = "button"; b.className = "reset-settings"; b.textContent = "reset site settings";
            b.addEventListener("click", () => {
                ["dd-high-contrast", "dd-reduce-motion", "dd-music-volume", "dd-player-mini", "dd-music-loop"].forEach((k) => { try { localStorage.removeItem(k); } catch {} });
                try { sessionStorage.removeItem("donidonka-music-v1"); } catch {}
                document.documentElement.classList.remove("high-contrast", "user-reduced-motion");
                document.querySelectorAll("#contrast-toggle, #motion-toggle").forEach((t) => t.setAttribute("aria-pressed", "false"));
                const audio = document.getElementById("background-audio"), vol = document.getElementById("music-volume");
                if (audio) { audio.volume = 0.3; audio.muted = false; } if (vol) vol.value = "30";
                if (window.ddPlayerApi) { window.ddPlayerApi.setMini(innerHeight < 700); window.ddPlayerApi.setLoop(true); }
                b.textContent = "settings reset"; window.ddToast("settings reset", "contrast, motion, volume and loop are back to default.", 3000); setTimeout(() => { b.textContent = "reset site settings"; }, 2200);
            });
            note.append(" · ", b);
        }
    }

    // real repo info from github's public api (updated date + language). fails quietly; nothing is invented.
    function repoInfo() {
        const rel = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
        const ago = (iso) => { const d = Math.round((new Date(iso) - Date.now()) / 864e5);
            return Math.abs(d) < 1 ? "today" : Math.abs(d) < 60 ? rel.format(d, "day") : Math.abs(d) < 700 ? rel.format(Math.round(d / 30), "month") : rel.format(Math.round(d / 365), "year"); };
        document.querySelectorAll('.project-filter-card[href^="https://github.com/DoniDonka/"]').forEach(async (card) => {
            const repo = new URL(card.href).pathname.split("/").filter(Boolean)[1];
            if (!repo || card.querySelector(".repo-live")) return;
            const key = "dd-gh-" + repo; let data = null;
            try { const c = JSON.parse(sessionStorage.getItem(key) || "null"); if (c && Date.now() - c.t < 9e5) data = c.d; } catch {}
            try {
                if (!data) { const r = await fetch("https://api.github.com/repos/DoniDonka/" + repo); if (!r.ok) return; data = await r.json();
                    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: { pushed_at: data.pushed_at, language: data.language } })); } catch {} }
                if (!data.pushed_at || !card.isConnected || card.querySelector(".repo-live")) return;
                const s = document.createElement("span"); s.className = "repo-live";
                s.textContent = "last pushed " + ago(data.pushed_at) + (data.language ? " · " + data.language : ""); card.appendChild(s);
            } catch {}
        });
    }

    // share button where the browser supports it
    function shareButton() {
        const note = document.querySelector(".footer-note");
        if (!navigator.share || !note || note.querySelector(".share-page")) return;
        const b = document.createElement("button"); b.type = "button"; b.className = "reset-settings share-page"; b.textContent = "share";
        b.addEventListener("click", () => navigator.share({ title: document.title, url: location.href }).catch(() => {}));
        note.append(" · ", b);
    }

    // watermark parallax: one passive scroll listener for the whole session, batched with rAF
    let wmTick = false;
    window.addEventListener("scroll", () => { const h = document.querySelector(".site-header"); if (h) h.classList.toggle("is-scrolled", scrollY > 12); }, { passive: true });
    window.addEventListener("scroll", () => {
        if (wmTick || prefersLess() || document.documentElement.classList.contains("user-reduced-motion")) return;
        wmTick = true;
        requestAnimationFrame(() => { document.documentElement.style.setProperty("--wm", Math.min(scrollY * 0.04, 36) + "px"); document.documentElement.style.setProperty("--sy", scrollY + "px"); document.documentElement.style.setProperty("--prog", Math.min(100, Math.max(0, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) * 100)).toFixed(1)); wmTick = false; });
    }, { passive: true });

    window.ddInitFx = () => { track(); stars(); player(); page(); secretPages(); projectsAndReset(); repoInfo(); shareButton(); anchorsAndPager(); };
    window.ddReady(window.ddInitFx);
})();
