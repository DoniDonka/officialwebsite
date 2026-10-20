/* same-origin page swapping so the music player (and its <audio>) is never reloaded.
   plain urls, back/forward, and direct loads all still work; any failure falls back to a normal page load. */
(function () {
    "use strict";
    const shellSel = ".site-shell", playerSel = ".music-player-global";
    let busy = false, lastPath = location.pathname;
    const cache = new Map();
    const fetchPage = (href) => { if (!cache.has(href)) cache.set(href, fetch(href, { headers: { Accept: "text/html" } }).catch((e) => { cache.delete(href); throw e; })); return cache.get(href); };

    const internal = (a) => a.origin === location.origin && /\.html?$|\/$/.test(a.pathname) &&
        !a.hasAttribute("download") && (!a.target || a.target === "_self");

    async function go(url, push) {
        if (busy) return; busy = true;
        try {
            const res = (await fetchPage(url.href)).clone();
            if (!res.ok || !/text\/html/.test(res.headers.get("content-type") || "")) throw new Error("bad response");
            const doc = new DOMParser().parseFromString(await res.text(), "text/html");
            const nextShell = doc.querySelector(shellSel), shell = document.querySelector(shellSel);
            const player = document.querySelector(playerSel);
            if (!nextShell || !shell || !player) throw new Error("no shell");

            window.__ddCleanup.splice(0).forEach((fn) => fn());
            nextShell.querySelectorAll(playerSel + ", script").forEach((n) => n.remove());
            Array.from(shell.children).forEach((n) => { if (n !== player && !n.contains(player)) n.remove(); });
            if (shell.contains(player) && player.parentElement !== shell) shell.appendChild(player);
            const kids = Array.from(nextShell.children).map((n) => document.importNode(n, true));
            const split = kids.findIndex((n) => n.tagName === "FOOTER");
            kids.forEach((n, i) => (split !== -1 && i >= split) ? shell.appendChild(n) : shell.insertBefore(n, player));

            document.title = doc.title;
            const desc = doc.querySelector('meta[name="description"]'), cur = document.querySelector('meta[name="description"]');
            if (desc && cur) cur.content = desc.content;
            document.body.className = doc.body.className;
            if (push) { history.replaceState({ y: scrollY }, ""); history.pushState({}, "", url.href); }
            lastPath = url.pathname;
            window.ddInitMain(); window.ddInitExtra(); if (window.ddInitFx) window.ddInitFx();
            const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (target) target.scrollIntoView(); else window.scrollTo(0, push ? 0 : (history.state && history.state.y) || 0);
        } catch (err) {
            location.href = url.href;
        } finally { busy = false; }
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
