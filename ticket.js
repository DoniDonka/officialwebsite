/* support tickets: a plain form that posts to a form service, which emails the message to the site owner.
   nothing here pretends to send: the send button stays off until config.js has a working key. */
(function () {
    "use strict";
    window.ddTicketInit = function () {
        const form = document.getElementById("ticket-form");
        if (!form || form.dataset.on) return; form.dataset.on = "1";
        const cfg = window.DD_CONFIG || {}, fields = cfg.ticketFields || {}, endpoint = cfg.ticketEndpoint || "";
        const enabled = Boolean(endpoint) && Object.values(fields).every(Boolean);
        const el = (id) => document.getElementById(id), f = form.elements;
        const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
        const opened = Date.now(), topics = { bug: "bug on the site", question: "question about a project", idea: "idea or collab", other: "something else" };
        const status = (t) => { el("ticket-status").textContent = t; };
        const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

        if (!enabled) { el("ticket-off").hidden = false; el("t-send").disabled = true; }
        const q = new URLSearchParams(location.search).get("topic"); if (q && topics[q]) f.topic.value = q;
        const prev = sessionStorage.getItem("dd-last-real") || "", prevName = prev === "/" || /index\.html$/.test(prev) ? "the home page" : prev.replace(/^\//, "");
        if (prev) el("ticket-from").textContent = "you were on " + prevName + " before this, and i'll see that.";

        // draft: kept while you click around, cleared once sent
        const draftKey = "dd-ticket-draft"; let draftTimer = 0;
        try { const d = JSON.parse(store.get(draftKey) || "null"); if (d) { ["subject", "message", "reply"].forEach((k) => { if (d[k]) f[k].value = d[k]; }); if (d.topic && !q && topics[d.topic]) f.topic.value = d.topic; } } catch {}
        const count = () => { el("t-count").textContent = f.message.value.length + " / 2000"; };
        count();
        form.addEventListener("input", () => {
            count(); clearTimeout(draftTimer);
            draftTimer = setTimeout(() => { const d = { topic: f.topic.value, subject: f.subject.value, message: f.message.value, reply: f.reply.value };
                if (d.subject || d.message || d.reply) { store.set(draftKey, JSON.stringify(d)); el("t-draft").textContent = "draft saved on this device"; } else { store.del(draftKey); el("t-draft").textContent = ""; } }, 500);
        });

        const mine = () => { try { return JSON.parse(store.get("dd-tickets") || "[]"); } catch { return []; } };
        const renderMine = () => {
            const list = mine(), ul = el("ticket-list"); el("ticket-mine").hidden = !list.length; ul.textContent = "";
            list.forEach((t) => { const li = document.createElement("li"), c = document.createElement("code"), s = document.createElement("span"); c.textContent = t.id; s.textContent = t.subject + " · " + t.at + " · sent"; li.append(c, s); ul.appendChild(li); });
        };
        renderMine();

        const mkId = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"), abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let r = ""; crypto.getRandomValues(new Uint8Array(4)).forEach((x) => { r += abc[x % abc.length]; }); return "DD-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + r; };
        const body = (id) => {
            const reply = f.reply.value.trim(), lines = [f.message.value.trim(), "", "---", "ticket: " + id, "topic: " + topics[f.topic.value], "sent from: " + location.href];
            if (prev) lines.push("was on: " + prev); if (reply) lines.push("reply to: " + reply);
            if (f.include_tech.checked) lines.push("browser: " + navigator.userAgent, "screen: " + screen.width + "x" + screen.height + " (window " + innerWidth + "x" + innerHeight + ", dpr " + devicePixelRatio + ")", "language: " + navigator.language, "reduced motion: " + matchMedia("(prefers-reduced-motion: reduce)").matches);
            return lines.join("\n");
        };

        const errs = () => {
            ["subject", "message", "reply"].forEach((k) => { el("err-" + k).textContent = ""; f[k].removeAttribute("aria-invalid"); });
            const bad = (k, msg) => { el("err-" + k).textContent = msg; f[k].setAttribute("aria-invalid", "true"); return f[k]; };
            const s = f.subject.value.trim(), m = f.message.value.trim(), r = f.reply.value.trim(); let first = null;
            if (s.length < 3) { const x = bad("subject", "give it a short subject (at least 3 characters)."); first = first || x; }
            if (m.length < 10) { const x = bad("message", "tell me a bit more (at least 10 characters)."); first = first || x; }
            if (r.length > 120) { const x = bad("reply", "that's a bit long. an email or a username is enough."); first = first || x; }
            return first;
        };

        el("t-copy").addEventListener("click", async () => {
            const text = "subject: " + f.subject.value.trim() + "\n\n" + body("(not sent)");
            try { await navigator.clipboard.writeText(text); window.ddToast("copied", "your message is on the clipboard. you can paste it on github.", 3500); } catch { window.ddToast("couldn't copy", "your browser blocked it. select the text and copy it yourself.", 3500); }
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault(); if (!enabled) return; status("");
            const bad = errs(); if (bad) { bad.focus(); status("a couple of things need fixing."); return; }
            if (f.website.value) { status("couldn't send that. if you're a real person, reload the page and try again."); return; }
            if (Date.now() - opened < 2500) { status("that was quick. give it a second and try again."); return; }
            const now = Date.now(), log = (() => { try { return JSON.parse(store.get("dd-ticket-log") || "[]"); } catch { return []; } })().filter((t) => now - t < 864e5);
            if (log.length && now - log[log.length - 1] < 60000) { status("wait " + Math.ceil((60000 - (now - log[log.length - 1])) / 1000) + "s before sending another one."); return; }
            if (log.length >= 5) { status("that's a few tickets today already. try again tomorrow, or use github."); return; }

            const id = mkId(), subj = f.subject.value.trim(), reply = f.reply.value.trim(), fd = new FormData();
            Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
            fd.append("subject", "[" + id + "] " + topics[f.topic.value] + ": " + subj); fd.append("from_name", "donidonka.info tickets");
            fd.append("message", body(id)); fd.append("ticket_id", id); fd.append("topic", topics[f.topic.value]); if (isEmail(reply)) fd.append("email", reply);
            const send = el("t-send"); send.disabled = true; send.textContent = "sending…"; status("sending…");
            const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
            try {
                const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: fd, signal: ctrl.signal });
                let data = {}; try { data = await res.json(); } catch {}
                if (!(res.ok && data.success !== false && data.ok !== false)) throw new Error(typeof data.message === "string" ? data.message.slice(0, 140) : "the form service said no (" + res.status + ")");
                log.push(now); store.set("dd-ticket-log", JSON.stringify(log));
                const list = mine(); list.unshift({ id, subject: subj.slice(0, 60), at: new Date().toISOString().slice(0, 10) }); store.set("dd-tickets", JSON.stringify(list.slice(0, 20)));
                store.del(draftKey); form.reset(); count(); el("t-draft").textContent = ""; renderMine();
                el("done-id").textContent = id; form.hidden = true; const done = el("ticket-done"); done.hidden = false; done.focus();
                window.ddToast("ticket sent", id, 5000);
            } catch (err) {
                status(err.name === "AbortError" ? "that took too long. check your connection and try again. your message is still here." : "couldn't send it: " + err.message + ". your message is still here, so you can try again or copy it.");
            } finally { clearTimeout(timer); send.disabled = !enabled; send.textContent = "send ticket"; }
        });

        el("done-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(el("done-id").textContent); window.ddToast("copied", el("done-id").textContent, 2000); } catch {} });
        el("done-again").addEventListener("click", () => { el("ticket-done").hidden = true; form.hidden = false; f.subject.focus(); });
    };
})();
