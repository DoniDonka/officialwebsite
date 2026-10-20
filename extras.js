/* extras: plain js, no libraries. ddInitFx re-runs after page swaps; the player bits only bind once. */
(function () {
    "use strict";
    const prefersLess = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
                    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

    function stars() {
        if (document.querySelector(".dd-stars")) return;
        const box = document.createElement("div"); box.className = "dd-stars"; box.setAttribute("aria-hidden", "true");
        [38, 22].forEach((n) => {
            const layer = document.createElement("i"), dots = [];
            for (let k = 0; k < n; k++) dots.push(`${Math.random() * 100}vw ${Math.random() * 100}vh 0 0 #bdbdbd`);
            layer.style.boxShadow = dots.join(","); box.appendChild(layer);
        });
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
        // "/" jumps to project search
        const search = document.getElementById("project-search");
        if (search && !search.dataset.fx) { search.dataset.fx = "1";
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
                b.textContent = "settings reset"; setTimeout(() => { b.textContent = "reset site settings"; }, 2200);
            });
            note.append(" · ", b);
        }
    }

    // watermark parallax: one passive scroll listener for the whole session, batched with rAF
    let wmTick = false;
    window.addEventListener("scroll", () => {
        if (wmTick || prefersLess() || document.documentElement.classList.contains("user-reduced-motion")) return;
        wmTick = true;
        requestAnimationFrame(() => { document.documentElement.style.setProperty("--wm", Math.min(scrollY * 0.04, 36) + "px"); wmTick = false; });
    }, { passive: true });

    window.ddInitFx = () => { stars(); player(); page(); projectsAndReset(); };
    window.ddReady(window.ddInitFx);
})();
