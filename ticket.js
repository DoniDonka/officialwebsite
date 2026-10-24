/* support tickets. simple mode is the original short form. advanced mode adds the long one's options to the same form.
   nothing here pretends to send: the send button stays off until config.js has a working key. */
(function () {
    "use strict";
    window.ddTicketInit = function () {
        const form = document.getElementById("ticket-form");
        if (!form || form.dataset.on) return; form.dataset.on = "1";
        const cfg = window.DD_CONFIG || {}, fields = cfg.ticketFields || {}, endpoint = cfg.ticketEndpoint || "";
        const enabled = Boolean(endpoint) && Object.values(fields).every(Boolean);
        const el = (id) => document.getElementById(id), f = form.elements, box = el("t-adv-box"), more = el("t-adv-more"), boxes = [box, more], advBtn = el("t-adv"), advNote = el("t-adv-note"), noteOff = advNote.innerHTML;
        const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }, del: (k) => { try { localStorage.removeItem(k); } catch {} } };
        const opened = Date.now(), topics = { bug: "bug on the site", question: "question about a project", idea: "idea or collab", other: "something else" };
        const status = (t) => { el("ticket-status").textContent = t; };
        const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        const CH = {
            email:   { label: "your email", ph: "you@example.com", ok: isEmail, bad: "that doesn't look like an email address." },
            discord: { label: "your discord username", ph: "username (no @ needed)", ok: (v) => /^@?[a-zA-Z0-9_.]{2,32}(#\d{4})?$/.test(v), bad: "discord usernames are 2–32 letters, numbers, dots or underscores." },
            github:  { label: "your github username", ph: "octocat", ok: (v) => /^@?[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(v), bad: "that isn't a valid github username." },
            roblox:  { label: "your roblox username", ph: "username", ok: (v) => /^[A-Za-z0-9_]{3,20}$/.test(v), bad: "roblox usernames are 3–20 letters, numbers or underscores." },
            youtube: { label: "your youtube channel", ph: "@yourchannel", ok: (v) => v.length >= 2 && v.length <= 60, bad: "type your channel name or @handle." },
            none:    { label: "", ph: "", ok: () => true, bad: "" }
        };
        const adv = () => !box.hidden, val = (n) => (f[n] && f[n].value ? f[n].value.trim() : "");
        const ADV_KEYS = ["priority", "reply_language", "best_time", "project", "page_affected", "how_often", "device_type", "steps_to_reproduce", "expected", "actual", "the_idea", "timeline", "what_they_want", "helpful_link"];

        if (!enabled) { el("ticket-off").hidden = false; el("t-send").disabled = true; }
        const q = new URLSearchParams(location.search).get("topic"); if (q && topics[q]) f.topic.value = q;
        const prev = sessionStorage.getItem("dd-last-real") || "", prevName = prev === "/" || /index\.html$/.test(prev) ? "the home page" : prev.replace(/^\//, "");
        if (prev) el("ticket-from").textContent = "you were on " + prevName + " before this, and i'll see that.";
        el("t-tz").textContent = (Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown");
        if (!f.page_affected.value) f.page_affected.value = prev ? location.origin + prev : "";

        // ---- what's visible depends on the mode and on the topic ----
        function sync() {
            const on = adv(), t = f.topic.value, via = f.reply_via.value;
            boxes.forEach((bx) => bx.querySelectorAll("input,select,textarea").forEach((x) => { x.disabled = !on; }));
            more.querySelectorAll("[data-for]").forEach((g) => { const show = on && g.dataset.for.split(" ").includes(t); g.hidden = !show; g.querySelectorAll("input,select,textarea").forEach((x) => { x.disabled = !show; }); });
            const c = CH[on ? via : "email"];
            el("t-reply-wrap").hidden = on && via === "none"; f.reply.disabled = on && via === "none";
            el("t-reply-l").firstChild.textContent = on ? c.label + " " : "how can i reply? "; f.reply.placeholder = on ? c.ph : "an email, or a discord / github name";
            el("t-reply-opt").textContent = on && via !== "none" ? "(needed so i can answer)" : "(optional)";
            advBtn.setAttribute("aria-pressed", String(on)); advBtn.setAttribute("aria-expanded", String(on)); advBtn.textContent = on ? "advanced mode: on" : "advanced mode";
            advNote.innerHTML = on ? "advanced options are open just below. bug and idea details show up under your message box." : noteOff;
            count(); preview();
        }
        const count = () => { el("t-count").textContent = f.message.value.length + " / 2000"; };

        function entries() {   // advanced details, in the order they're written in the email
            const e = [], via = f.reply_via.value; if (!adv()) return e;
            e.push(["priority", f.priority.options[f.priority.selectedIndex].text], ["reply via", via === "none" ? "no reply needed" : via]);
            e.push(["reply language", val("reply_language")], ["best time", val("best_time")], ["timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"]);
            ["project", "page_affected", "how_often", "device_type", "steps_to_reproduce", "expected", "actual", "the_idea", "timeline", "what_they_want", "helpful_link"].forEach((n) => { if (f[n] && !f[n].disabled && val(n)) e.push([n.replace(/_/g, " "), val(n)]); });
            return e;
        }
        const body = (id) => {
            const reply = val("reply"), lines = [val("message"), "", "---", "ticket: " + (id || "(made when you send)"), "topic: " + topics[f.topic.value]];
            entries().forEach(([k, v]) => lines.push(k + ": " + v)); lines.push("sent from: " + location.href);
            if (prev) lines.push("was on: " + prev); if (reply && !f.reply.disabled) lines.push("reply to: " + reply);
            if (f.include_tech.checked) lines.push("browser: " + navigator.userAgent, "screen: " + screen.width + "x" + screen.height + " (window " + innerWidth + "x" + innerHeight + ", dpr " + devicePixelRatio + ")", "language: " + navigator.language, "reduced motion: " + matchMedia("(prefers-reduced-motion: reduce)").matches);
            return lines.join("\n");
        };
        const preview = () => { if (adv()) el("t-prev-pre").textContent = "subject: " + val("subject") + "\n\n" + body(null); };

        // ---- draft: every field, kept while you click around, cleared once sent ----
        const draftKey = "dd-ticket-draft"; let draftTimer = 0;
        if (store.get("dd-ticket-adv") === "1") boxes.forEach((bx) => { bx.hidden = false; });
        try { const d = JSON.parse(store.get(draftKey) || "null"); if (d) Object.entries(d).forEach(([n, v]) => { const x = f[n]; if (!x || x.name === "website") return; if (x.type === "checkbox") x.checked = !!v; else if (n === "topic" && q) return; else x.value = v; }); } catch {}
        const save = () => { const d = {}; Array.from(form.elements).forEach((x) => { if (!x.name || x.name === "website" || x.type === "submit" || x.type === "button") return; if (x.type === "checkbox") d[x.name] = x.checked; else if (x.value) d[x.name] = x.value; });
            if (val("subject") || val("message") || val("reply")) { store.set(draftKey, JSON.stringify(d)); el("t-draft").textContent = "draft saved on this device"; } else { store.del(draftKey); el("t-draft").textContent = ""; } };
        const later = () => { sync(); clearTimeout(draftTimer); draftTimer = setTimeout(save, 500); };
        form.addEventListener("input", later); form.addEventListener("change", later);
        advBtn.addEventListener("click", () => { const open = box.hidden; boxes.forEach((bx) => { bx.hidden = !open; }); store.set("dd-ticket-adv", open ? "1" : "0"); sync(); if (open) { f.priority.focus({ preventScroll: true }); box.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } });

        const mine = () => { try { return JSON.parse(store.get("dd-tickets") || "[]"); } catch { return []; } };
        const renderMine = () => { const list = mine(), ul = el("ticket-list"); el("ticket-mine").hidden = !list.length; ul.textContent = "";
            list.forEach((t) => { const li = document.createElement("li"), c = document.createElement("code"), s = document.createElement("span"); c.textContent = t.id; s.textContent = t.subject + " · " + t.at + " · sent"; li.append(c, s); ul.appendChild(li); }); };
        renderMine(); sync();

        const mkId = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"), abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let r = ""; crypto.getRandomValues(new Uint8Array(4)).forEach((x) => { r += abc[x % abc.length]; }); return "DD-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + r; };
        const errs = () => {
            ["subject", "message", "reply"].forEach((k) => { el("err-" + k).textContent = ""; f[k].removeAttribute("aria-invalid"); });
            const bad = (k, msg) => { el("err-" + k).textContent = msg; f[k].setAttribute("aria-invalid", "true"); return f[k]; };
            const s = val("subject"), m = val("message"), r = val("reply"); let first = null;
            if (s.length < 3) { const x = bad("subject", "give it a short subject (at least 3 characters)."); first = first || x; }
            if (m.length < 10) { const x = bad("message", "tell me a bit more (at least 10 characters)."); first = first || x; }
            if (adv() && f.reply_via.value !== "none") { if (!CH[f.reply_via.value].ok(r)) { const x = bad("reply", r ? CH[f.reply_via.value].bad : 'tell me where to reply, or pick "no reply".'); first = first || x; } }
            else if (r.length > 120) { const x = bad("reply", "that's a bit long. an email or a username is enough."); first = first || x; }
            return first;
        };

        el("t-copy").addEventListener("click", async () => {
            try { await navigator.clipboard.writeText("subject: " + val("subject") + "\n\n" + body("(not sent)")); window.ddToast("copied", "your message is on the clipboard. you can paste it on github.", 3500); } catch { window.ddToast("couldn't copy", "your browser blocked it. select the text and copy it yourself.", 3500); }
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault(); if (!enabled) return; status("");
            const bad = errs(); if (bad) { bad.focus(); status("a couple of things need fixing."); return; }
            if (f.website.value) { status("couldn't send that. if you're a real person, reload the page and try again."); return; }
            if (Date.now() - opened < 2500) { status("that was quick. give it a second and try again."); return; }
            const now = Date.now(), log = (() => { try { return JSON.parse(store.get("dd-ticket-log") || "[]"); } catch { return []; } })().filter((t) => now - t < 864e5);
            if (log.length && now - log[log.length - 1] < 60000) { status("wait " + Math.ceil((60000 - (now - log[log.length - 1])) / 1000) + "s before sending another one."); return; }
            if (log.length >= 5) { status("that's a few tickets today already. try again tomorrow, or use github."); return; }

            const id = mkId(), subj = val("subject"), reply = val("reply"), fd = new FormData();
            Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
            fd.append("subject", "[" + id + "] " + topics[f.topic.value] + (adv() && f.priority.value === "urgent" ? " (URGENT)" : "") + ": " + subj); fd.append("from_name", "donidonka.info tickets");
            fd.append("message", body(id)); fd.append("ticket_id", id); fd.append("topic", topics[f.topic.value]);
            if (adv()) { fd.append("reply_via", f.reply_via.value); ADV_KEYS.forEach((n) => { if (f[n] && !f[n].disabled && val(n)) fd.append(n, val(n)); }); }
            if (isEmail(reply) && !f.reply.disabled && (!adv() || f.reply_via.value === "email")) fd.append("email", reply);
            const send = el("t-send"); send.disabled = true; send.textContent = "sending…"; status("sending…");
            const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 15000);
            try {
                const res = await fetch(endpoint, { method: "POST", headers: { Accept: "application/json" }, body: fd, signal: ctrl.signal });
                let data = {}; try { data = await res.json(); } catch {}
                if (!(res.ok && data.success !== false && data.ok !== false)) throw new Error(typeof data.message === "string" ? data.message.slice(0, 140) : "the form service said no (" + res.status + ")");
                const sentVia = adv() ? f.reply_via.value : "", wasAdv = adv();
                log.push(now); store.set("dd-ticket-log", JSON.stringify(log));
                const list = mine(); list.unshift({ id, subject: subj.slice(0, 60), at: new Date().toISOString().slice(0, 10) }); store.set("dd-tickets", JSON.stringify(list.slice(0, 20)));
                store.del(draftKey); form.reset(); sync(); el("t-draft").textContent = ""; renderMine();
                el("done-id").textContent = id; el("done-how").textContent = wasAdv && sentVia && sentVia !== "none" ? "i'll answer through " + sentVia + ", the way you picked." : wasAdv ? "you said no reply needed, so i won't write back unless i have to." : "";
                form.hidden = true; const done = el("ticket-done"); done.hidden = false; done.focus();
                window.ddToast("ticket sent", id, 5000);
            } catch (err) {
                status(err.name === "AbortError" ? "that took too long. check your connection and try again. your message is still here." : "couldn't send it: " + err.message + ". your message is still here, so you can try again or copy it.");
            } finally { clearTimeout(timer); send.disabled = !enabled; send.textContent = "send ticket"; }
        });

        el("done-copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(el("done-id").textContent); window.ddToast("copied", el("done-id").textContent, 2000); } catch {} });
        el("done-again").addEventListener("click", () => { el("ticket-done").hidden = true; form.hidden = false; f.subject.focus(); });
    };
})();
