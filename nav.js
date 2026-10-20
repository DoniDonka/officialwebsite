/* same-origin page swapping so the music player (and its <audio>) is never reloaded.
   plain urls, back/forward, and direct loads all still work; any failure falls back to a normal page load. */
(function () {
    "use strict";
    const shellSel = ".site-shell", playerSel = ".music-player-global";
    let busy = false;

    const internal = (a) => a.origin === location.origin && /\.html?$|\/$/.test(a.pathname) &&
        !a.hasAttribute("download") && (!a.target || a.target === "_self");

    async function go(url, push) {
        if (busy) return; busy = true;
        try {
            const res = await fetch(url.href, { headers: { Accept: "text/html" } });
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
            if (push) history.pushState({}, "", url.href);
            window.ddInitMain(); window.ddInitExtra(); if (window.ddInitFx) window.ddInitFx();
            const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
            if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
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
    window.addEventListener("popstate", () => go(new URL(location.href), false));
})();
