/* same-origin page swapping so the music player (and its <audio>) is never reloaded.
   plain urls, back/forward, and direct loads all still work; any failure falls back to a normal page load. */
(function () {
    "use strict";
    const shellSel = ".site-shell", playerSel = ".music-player-global";
    let busy = false, lastPath = location.pathname;
    const cache = new Map();
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion");
    const order = () => Array.from(document.querySelectorAll(".main-nav a")).map((a) => new URL(a.href).pathname);
    const live = document.createElement("div"); live.className = "visually-hidden"; live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite");
    const bar = document.createElement("div"); bar.className = "dd-nav-bar"; bar.setAttribute("aria-hidden", "true");
    document.addEventListener("DOMContentLoaded", () => document.body.append(live, bar), { once: true });
    const fetchPage = (href) => { if (!cache.has(href)) cache.set(href, fetch(href, { headers: { Accept: "text/html" } }).catch((e) => { cache.delete(href); throw e; })); return cache.get(href); };

    const internal = (a) => a.origin === location.origin && /\.html?$|\/$/.test(a.pathname) &&
        !a.hasAttribute("download") && (!a.target || a.target === "_self");

    async function go(url, push) {
        if (busy) return; busy = true;
        const slowTimer = setTimeout(() => bar.classList.add("is-on"), 250);
        try {
            const o = order(), from = o.indexOf(location.pathname), to = o.indexOf(url.pathname);
            document.documentElement.style.setProperty("--dd-dir", from === -1 || to === -1 || to >= from ? "1" : "-1");
            const leaving = document.querySelector(shellSel + " > main");
            if (leaving && !reduced()) leaving.classList.add("is-leaving");
            const pause = reduced() ? Promise.resolve() : new Promise((r) => setTimeout(r, 170));
            const [pageRes] = await Promise.all([fetchPage(url.href), pause]); const res = pageRes.clone();
            if (!res.ok || !/text\/html/.test(res.headers.get("content-type") || "")) throw new Error("bad response");
            const doc = new DOMParser().parseFromString(await res.text(), "text/html");
            const nextShell = doc.querySelector(shellSel), shell = document.querySelector(shellSel);
            const player = document.querySelector(playerSel);
            if (!nextShell || !shell || !player) throw new Error("no shell");

            window.__ddCleanup.splice(0).forEach((fn) => fn());
            const inline = Array.from(nextShell.querySelectorAll("main script:not([src])")).map((s) => s.textContent);
            nextShell.querySelectorAll(playerSel + ", script").forEach((n) => n.remove());
            Array.from(shell.children).forEach((n) => { if (n !== player && !n.contains(player)) n.remove(); });
            if (shell.contains(player) && player.parentElement !== shell) shell.appendChild(player);
            const kids = Array.from(nextShell.children).map((n) => document.importNode(n, true));
            const split = kids.findIndex((n) => n.tagName === "FOOTER");
            kids.forEach((n, i) => (split !== -1 && i >= split) ? shell.appendChild(n) : shell.insertBefore(n, player));

            document.title = doc.title;
            const canon = doc.querySelector('link[rel="canonical"]'), curCanon = document.querySelector('link[rel="canonical"]');
            if (canon && curCanon) curCanon.href = canon.href;
            const desc = doc.querySelector('meta[name="description"]'), cur = document.querySelector('meta[name="description"]');
            if (desc && cur) cur.content = desc.content;
            document.body.className = doc.body.className;
            if (push) { history.replaceState({ y: scrollY }, ""); history.pushState({}, "", url.href); }
            lastPath = url.pathname;
            window.ddInitMain(); window.ddInitExtra(); if (window.ddInitFx) window.ddInitFx();
            inline.forEach((code) => { const s = document.createElement("script"); s.textContent = code; document.body.appendChild(s); s.remove(); });
            const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (target) target.scrollIntoView(); else window.scrollTo({ top: push ? 0 : (history.state && history.state.y) || 0, left: 0, behavior: "instant" });
            const main = document.querySelector("main"); if (main) { main.tabIndex = -1; main.focus({ preventScroll: true }); }
            live.textContent = ""; setTimeout(() => { live.textContent = doc.title; }, 60);
        } catch (err) {
            location.href = url.href;
        } finally { clearTimeout(slowTimer); bar.classList.remove("is-on"); busy = false; }
    }

    document.addEventListener("click", (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest("a[href]");
        if (!a || !internal(a)) return;
        if (a.pathname === location.pathname && a.hash) return; // same-page anchor: let the browser handle it
        e.preventDefault(); go(new URL(a.href), true);
    });
    const warm = (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a && internal(a) && a.pathname !== location.pathname) fetchPage(a.href).catch(() => {}); };
    document.addEventListener("pointerover", warm); document.addEventListener("focusin", warm);
    window.addEventListener("popstate", () => { if (location.pathname !== lastPath) go(new URL(location.href), false); });
})();
