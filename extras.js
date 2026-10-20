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
        const setMute = () => { mute.textContent = audio.muted ? "off" : "on"; mute.setAttribute("aria-label", audio.muted ? "unmute music" : "mute music"); mute.setAttribute("aria-pressed", String(audio.muted)); };
        const saved = store.get("dd-player-mini");
        setMini(saved === null ? innerHeight < 700 : saved === "1");
        mini.addEventListener("click", () => { const on = !p.classList.contains("is-mini"); setMini(on); store.set("dd-player-mini", on ? "1" : "0"); });
        mute.addEventListener("click", () => { audio.muted = !audio.muted; setMute(); });
        audio.addEventListener("volumechange", setMute); setMute();
        p.append(mute, mini);
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

    window.ddInitFx = () => { stars(); player(); page(); };
    window.ddReady(window.ddInitFx);
})();
