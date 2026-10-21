/* extras: plain js, no libraries. ddInitFx re-runs after page swaps; the player bits only bind once. */
(function () {
    "use strict";
    const prefersLess = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
                    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

    window.ddToast = (title, msg, ms = 4500) => {
        let box = document.querySelector(".dd-toasts");
        if (!box) { box = document.createElement("div"); box.className = "dd-toasts"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
        const t = document.createElement("div"); t.className = "dd-toast"; t.innerHTML = "<strong></strong><span></span>";
        t.firstChild.textContent = title; t.lastChild.textContent = msg; box.appendChild(t);
        setTimeout(() => { t.classList.add("is-out"); setTimeout(() => t.remove(), 300); }, ms);
    };
    document.addEventListener("visibilitychange", () => document.documentElement.classList.toggle("dd-paused", document.hidden));
    const shootLoop = () => {
        const wait = 14000 + Math.random() * 18000;
        setTimeout(() => {
            if (!document.hidden && !prefersLess() && !document.documentElement.classList.contains("user-reduced-motion")) {
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
        const tag = () => { const t = document.title.replace(/^♪ /, ""); document.title = audio.paused ? t : "♪ " + t; };
        audio.addEventListener("play", tag); audio.addEventListener("pause", tag);
        setTimeout(() => { if (audio.paused && !sessionStorage.getItem("dd-music-toast")) { try { sessionStorage.setItem("dd-music-toast", "1"); } catch {} window.ddToast("music is paused", "your browser blocks autoplay with sound. press play on the player to start it."); } }, 2400);
        audio.addEventListener("error", () => { const s = document.getElementById("music-status"); if (s) { s.textContent = "couldn't load the music file"; s.classList.add("music-error"); } });
        document.addEventListener("keydown", (e) => {   // "m" mutes, unless you're typing
            if (e.key.toLowerCase() !== "m" || e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
            audio.muted = !audio.muted; setMute();
        });
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
            [["github", "https://github.com/DoniDonka"], ["youtube", "https://www.youtube.com/@schoolinformer177"], ["roblox", "https://www.roblox.com/search/users?keyword=DoniDonka"], ["projects", "projects.html"]].forEach(([t, h]) => {
                const a = document.createElement("a"); a.textContent = t; a.href = h; if (h.startsWith("http")) { a.target = "_blank"; a.rel = "noopener noreferrer"; } nav.appendChild(a);
            });
            foot.appendChild(nav);
        }
        const tt = document.title.replace(/^♪ /, ""), au = document.getElementById("background-audio"); document.title = au && !au.paused ? "♪ " + tt : tt;
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
        requestAnimationFrame(() => { document.documentElement.style.setProperty("--wm", Math.min(scrollY * 0.04, 36) + "px"); wmTick = false; });
    }, { passive: true });

    window.ddInitFx = () => { stars(); player(); page(); projectsAndReset(); repoInfo(); shareButton(); };
    window.ddReady(window.ddInitFx);
})();
