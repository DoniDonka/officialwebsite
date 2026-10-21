window.ddGo=(href)=>{const a=document.querySelector('.main-nav a[href="'+href+'"]');if(a)a.click();else location.href=href;};
window.ddReady=(fn)=>document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn();
window.__ddCleanup=[];

"use strict";

window.ddInitMain = () => {
    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    // Highlight the navigation item for the current section.
    const navigationLinks = Array.from(
        document.querySelectorAll(".nav-link[href^='#']")
    );

    const sections = navigationLinks
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    function setActiveLink(id) {
        navigationLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${id}`;

            link.classList.toggle("active", isActive);

            if (isActive) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    // Mark a clicked navigation item immediately.
    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const id = link.getAttribute("href").slice(1);
            setActiveLink(id);
        });
    });

    // Keep navigation highlighting in sync with scrolling.
    if ("IntersectionObserver" in window && sections.length > 0) {
        const sectionObserver = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (a, b) =>
                            b.intersectionRatio - a.intersectionRatio
                    );

                if (visibleSections.length > 0) {
                    setActiveLink(visibleSections[0].target.id);
                }
            },
            {
                rootMargin: "-18% 0px -60% 0px",
                threshold: [0, 0.1, 0.25, 0.5]
            }
        );

        sections.forEach((section) => {
            sectionObserver.observe(section);
        });
    }

    // Reveal elements gently as they enter the viewport.
    if (
        !reduceMotion &&
        "IntersectionObserver" in window
    ) {
        const revealElements = document.querySelectorAll(
            ".profile, .terminal-panel, .link-card, " +
            ".content-section, .site-footer"
        );

        document.body.classList.add("has-js");

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.08,
                rootMargin: "0px 0px -24px 0px"
            }
        );

        revealElements.forEach((element, index) => {
            element.classList.add("js-reveal");

            // Slightly stagger the link cards without making them slow.
            if (element.classList.contains("link-card")) {
                element.style.transitionDelay =
                    `${(index % 3) * 55}ms`;
            }

            revealObserver.observe(element);
        });
    }

    // Mobile navigation: small menu that works on touch screens too.
    const menuToggle = document.querySelector(".mobile-menu-toggle");
    const mainNavigation = document.querySelector(".main-nav");
    if (menuToggle && mainNavigation) {
        menuToggle.addEventListener("click", () => {
            const open = menuToggle.getAttribute("aria-expanded") !== "true";
            menuToggle.setAttribute("aria-expanded", String(open));
            mainNavigation.classList.toggle("is-open", open);
            menuToggle.querySelector("span").textContent = open ? "－" : "＋";
        });
        mainNavigation.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                mainNavigation.classList.remove("is-open");
                menuToggle.setAttribute("aria-expanded", "false");
                menuToggle.querySelector("span").textContent = "＋";
            });
        });
    }

    // A small live clock, based on the visitor's own device.
    const liveClock = document.getElementById("live-clock");
    if (liveClock) {
        const updateClock = () => {
            liveClock.textContent = new Intl.DateTimeFormat(undefined, {
                hour: "2-digit", minute: "2-digit", second: "2-digit"
            }).format(new Date());
        };
        updateClock();
        { const clockTimer = window.setInterval(updateClock, 1000); window.__ddCleanup.push(() => window.clearInterval(clockTimer)); }
    }

    // This is intentionally a per-browser count, not a fake global visitor total.
    const visitCounter = document.getElementById("visit-counter");
    if (visitCounter) {
        try {
            const key = "donidonka-site-visits-v1";
            const visits = Number(localStorage.getItem(key) || "0") + 1;
            localStorage.setItem(key, String(visits));
            visitCounter.textContent = visits.toLocaleString();
        } catch {
            visitCounter.textContent = "—";
        }
    }

    // Start at the top with Home selected.
    if (window.location.hash) {
        const currentSection = document.querySelector(
            window.location.hash
        );

        if (currentSection) {
            setActiveLink(currentSection.id);
        }
    } else {
        setActiveLink("home");
    }

    // one player on every page. remember playback between page changes.
    let audio = document.getElementById("background-audio");
    if (!audio) {
        const player = document.createElement("div");
        player.className = "music-player music-player-global";
        player.setAttribute("aria-label", "background music player");
        player.innerHTML = '<audio id="background-audio" preload="metadata" autoplay loop><source src="assets/moog-city-light.mp3" type="audio/mpeg"></audio><button class="music-play-button" id="music-play-button" type="button" aria-label="play background music" aria-pressed="false"><span class="music-play-symbol" aria-hidden="true">▶</span></button><div class="music-details"><p class="music-eyebrow">music</p><p class="music-title">moog city <span>· slowed + reverb</span></p><p class="music-status" id="music-status" aria-live="polite">tap play if your browser blocks autoplay</p><div class="music-timeline"><span class="music-time" id="music-current-time">0:00</span><input class="music-seek" id="music-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="seek through music"><span class="music-time" id="music-duration">0:00</span></div></div><label class="music-volume-control"><span class="visually-hidden">music volume</span><span class="volume-symbol" aria-hidden="true">volume</span><input id="music-volume" type="range" min="0" max="100" value="30" aria-label="music volume"></label>';
        document.querySelector(".site-shell")?.appendChild(player);
        audio = document.getElementById("background-audio");
    }

    const playButton = document.getElementById("music-play-button");
    const playSymbol = playButton?.querySelector(".music-play-symbol");
    const musicStatus = document.getElementById("music-status");
    const seek = document.getElementById("music-seek");
    const currentTimeLabel = document.getElementById("music-current-time");
    const durationLabel = document.getElementById("music-duration");
    const volume = document.getElementById("music-volume");
    const musicKey = "donidonka-music-v1";
    let savedMusic = {};
    try { savedMusic = JSON.parse(sessionStorage.getItem(musicKey) || "{}"); } catch {}
    if (audio && playButton && playSymbol && musicStatus && seek && currentTimeLabel && durationLabel && volume && !audio.dataset.ddBound) {
        audio.dataset.ddBound = "1";
        audio.volume = savedMusic.volume !== undefined ? Number(savedMusic.volume) : Number(volume.value) / 100;
        volume.value = String(Math.round(audio.volume * 100));
        const formatTime = (seconds) => {
            if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
            return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
        };
        const saveMusic = () => {
            try { sessionStorage.setItem(musicKey, JSON.stringify({time: audio.currentTime || 0, volume: audio.volume, playing: !audio.paused, muted: audio.muted})); } catch {}
        };
        const updatePlaybackUI = () => {
            const playing = !audio.paused;
            playSymbol.textContent = playing ? "Ⅱ" : "▶";
            playButton.classList.toggle("is-playing", playing);
            playButton.setAttribute("aria-pressed", String(playing));
            playButton.setAttribute("aria-label", playing ? "pause background music" : "play background music");
            if (audio.error) musicStatus.textContent = "couldn't load the music file";
            else if (playing && audio.muted) musicStatus.textContent = "playing muted · tap to turn sound on";
            else if (playing) musicStatus.textContent = "playing";
            else musicStatus.textContent = "paused · press play to continue";
        };
        audio.addEventListener("loadedmetadata", () => {
            durationLabel.textContent = formatTime(audio.duration);
            if (Number.isFinite(savedMusic.time) && savedMusic.time > 0 && savedMusic.time < audio.duration) {
                audio.currentTime = savedMusic.time;
            }
            if (savedMusic.playing) audio.play().catch(() => { musicStatus.textContent = "tap play to continue"; });
        });
        audio.addEventListener("timeupdate", () => {
            currentTimeLabel.textContent = formatTime(audio.currentTime);
            if (Number.isFinite(audio.duration) && audio.duration > 0) seek.value = String(audio.currentTime / audio.duration * 100);
            saveMusic();
        });
        audio.addEventListener("play", updatePlaybackUI);
        audio.addEventListener("pause", () => { updatePlaybackUI(); saveMusic(); });
        audio.addEventListener("ended", updatePlaybackUI);
        audio.addEventListener("error", () => { musicStatus.textContent = "couldn't load the music file"; });
        playButton.addEventListener("click", async () => {
            if (!audio.paused && audio.muted) audio.muted = false;
            else if (!audio.paused) audio.pause();
            else {
                try { audio.muted = false; await audio.play(); }
                catch { musicStatus.textContent = "your browser blocked autoplay · tap play again"; }
            }
            updatePlaybackUI(); saveMusic();
        });
        seek.addEventListener("input", () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = Number(seek.value) / 100 * audio.duration;
        });
        volume.addEventListener("input", () => {
            audio.volume = Number(volume.value) / 100;
            audio.muted = audio.volume === 0;
            saveMusic(); updatePlaybackUI();
        });
        audio.muted = Boolean(savedMusic.muted);
        if (savedMusic.playing) {
            if (Number.isFinite(savedMusic.time) && savedMusic.time > 0) audio.addEventListener("loadedmetadata", () => { audio.currentTime = Math.min(savedMusic.time, audio.duration || savedMusic.time); }, {once:true});
            audio.play().catch(() => { musicStatus.textContent = "tap play to continue"; });
        } else {
            audio.play().catch(() => { musicStatus.textContent = "tap play to start"; });
        }
        updatePlaybackUI();
    }

    // little quality-of-life bits: reading progress, back-to-top, copy page link.
    const progress = document.createElement("div");
    progress.className = "reading-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);
    const topButton = document.createElement("button");
    topButton.className = "back-to-top";
    topButton.type = "button";
    topButton.textContent = "↑";
    topButton.setAttribute("aria-label", "back to top");
    document.body.appendChild(topButton);
    const updateScrollBits = () => {
        const range = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (range > 0 ? window.scrollY / range * 100 : 0) + "%";
        topButton.classList.toggle("is-visible", window.scrollY > 320);
    };
    window.addEventListener("scroll", updateScrollBits, {passive:true});
    window.__ddCleanup.push(() => window.removeEventListener("scroll", updateScrollBits));
    updateScrollBits();
    topButton.addEventListener("click", () => window.scrollTo({top:0, behavior: reduceMotion ? "auto" : "smooth"}));

    const copyLink = document.createElement("button");
    copyLink.className = "copy-page-link";
    copyLink.type = "button";
    copyLink.textContent = "copy page link";
    copyLink.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            copyLink.textContent = "copied";
        } catch {
            copyLink.textContent = "copy not available";
        }
        window.setTimeout(() => { copyLink.textContent = "copy page link"; }, 1800);
    });
    const footer = document.querySelector(".site-footer");
    if (footer) footer.appendChild(copyLink);
};
window.ddReady(window.ddInitMain);


/* extra site details: practical stuff, no giant framework or popup circus */
(function () {
    "use strict";
    const ready = (fn) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, { once: true }) : fn();
    window.ddInitExtra = () => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Persistent monochrome appearance toggle. Keeps the page dark by default.
        const header = document.querySelector(".site-header");
        if (header && !document.querySelector(".site-preferences")) {
            const tools = document.createElement("div");
            tools.className = "site-preferences";
            tools.innerHTML = '<button type="button" class="quiet-toggle" id="contrast-toggle" aria-pressed="false" title="switch between soft gray and high contrast">contrast</button><button type="button" class="quiet-toggle" id="motion-toggle" aria-pressed="false" title="reduce site animations">motion</button>';
            header.appendChild(tools);
            const contrastButton = tools.querySelector("#contrast-toggle");
            const motionButton = tools.querySelector("#motion-toggle");
            try {
                if (localStorage.getItem("dd-high-contrast") === "1") document.documentElement.classList.add("high-contrast");
                if (localStorage.getItem("dd-reduce-motion") === "1") document.documentElement.classList.add("user-reduced-motion");
            } catch {}
            contrastButton.setAttribute("aria-pressed", String(document.documentElement.classList.contains("high-contrast")));
            motionButton.setAttribute("aria-pressed", String(document.documentElement.classList.contains("user-reduced-motion")));
            contrastButton.addEventListener("click", () => {
                const enabled = document.documentElement.classList.toggle("high-contrast");
                contrastButton.setAttribute("aria-pressed", String(enabled));
                try { localStorage.setItem("dd-high-contrast", enabled ? "1" : "0"); } catch {}
            });
            motionButton.addEventListener("click", () => {
                const enabled = document.documentElement.classList.toggle("user-reduced-motion");
                motionButton.setAttribute("aria-pressed", String(enabled));
                try { localStorage.setItem("dd-reduce-motion", enabled ? "1" : "0"); } catch {}
            });
        }

        // Add copy actions where they help, with a fallback for older browsers.
        const copyText = async (value) => {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
                return true;
            }
            const field = document.createElement("textarea");
            field.value = value; field.setAttribute("readonly", "");
            field.style.position = "fixed"; field.style.opacity = "0";
            document.body.appendChild(field); field.select();
            const ok = document.execCommand("copy"); field.remove();
            return ok;
        };
        document.querySelectorAll(".brand-mark").forEach((mark) => {
            mark.title = "copy donidonka.info";
            mark.tabIndex = 0;
            mark.setAttribute("role", "button");
            mark.setAttribute("aria-label", "copy website address");
            const copyDomain = async () => {
                try { await copyText("https://donidonka.info"); mark.classList.add("copied"); mark.textContent = "✓"; window.setTimeout(() => { mark.textContent = "D/"; mark.classList.remove("copied"); }, 1200); } catch {}
            };
            mark.addEventListener("click", copyDomain);
            mark.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); copyDomain(); } });
        });

        // Project search and category filters.
        const search = document.getElementById("project-search");
        const cards = Array.from(document.querySelectorAll(".project-filter-card"));
        if (search && cards.length) {
            let activeFilter = "all";
            const result = document.getElementById("project-result");
            const empty = document.querySelector(".empty-filter-message");
            const filters = Array.from(document.querySelectorAll("[data-project-filter]"));
            const runFilter = () => {
                const query = search.value.trim().toLowerCase();
                let visible = 0;
                cards.forEach((card) => {
                    const text = (card.textContent + " " + (card.dataset.tags || "")).toLowerCase();
                    const categoryMatch = activeFilter === "all" || (card.dataset.tags || "").split(/\s+/).includes(activeFilter);
                    const queryMatch = !query || text.includes(query);
                    const show = categoryMatch && queryMatch;
                    card.hidden = !show;
                    if (show) visible++;
                });
                if (result) result.textContent = visible + (visible === 1 ? " project" : " projects");
                if (empty) empty.hidden = visible !== 0;
            };
            search.addEventListener("input", runFilter);
            filters.forEach((button) => button.addEventListener("click", () => {
                activeFilter = button.dataset.projectFilter;
                filters.forEach((item) => item.classList.toggle("is-active", item === button));
                runFilter();
            }));
            runFilter();
        }

        // Small cursor-follow glow on cards only; never follows the pointer across the whole page.
        if (!reduceMotion && !document.documentElement.classList.contains("user-reduced-motion")) {
            document.querySelectorAll(".link-card, .project-card, .info-card, .gallery-tile").forEach((card) => {
                card.addEventListener("pointermove", (event) => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty("--pointer-x", (event.clientX - rect.left) + "px");
                    card.style.setProperty("--pointer-y", (event.clientY - rect.top) + "px");
                });
            });
        }

        // Image lightbox for real images added to the gallery later; no fake gallery assets.
        const lightbox = document.createElement("dialog");
        lightbox.className = "image-lightbox";
        lightbox.setAttribute("aria-label", "image viewer");
        lightbox.innerHTML = '<button type="button" class="lightbox-close" aria-label="close image">×</button><button type="button" class="lightbox-prev" aria-label="previous image">‹</button><button type="button" class="lightbox-next" aria-label="next image">›</button><img alt=""><p></p><a class="lightbox-save" download>save image</a>';
        document.body.appendChild(lightbox);
        window.__ddCleanup.push(() => lightbox.remove());
        const shots = Array.from(document.querySelectorAll(".gallery-tile img, .content-section img[data-lightbox]"));
        let shotIndex = 0;
        const show = (i) => {
            shotIndex = (i + shots.length) % shots.length;
            const im = shots[shotIndex], big = lightbox.querySelector("img");
            big.src = im.currentSrc || im.src; big.alt = im.alt; lightbox.querySelector(".lightbox-save").href = big.src;
            lightbox.querySelector("p").textContent = (im.dataset.caption || im.alt) + (shots.length > 1 ? "  ·  " + (shotIndex + 1) + " / " + shots.length : "");
        };
        lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
        lightbox.querySelector(".lightbox-prev").addEventListener("click", () => show(shotIndex - 1));
        lightbox.querySelector(".lightbox-next").addEventListener("click", () => show(shotIndex + 1));
        lightbox.querySelectorAll(".lightbox-prev, .lightbox-next").forEach((btn) => { btn.hidden = shots.length < 2; });
        lightbox.addEventListener("click", (event) => { if (event.target === lightbox) lightbox.close(); });
        shots.forEach((image, i) => {
            image.tabIndex = 0;
            const open = () => { show(i); lightbox.showModal(); };
            image.addEventListener("click", open);
            image.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
        });

        // Useful keyboard navigation without taking over normal browser shortcuts.
        const onKeydown = (event) => {
            if (event.key === "Escape") {
                if (lightbox.open) lightbox.close();
                document.querySelector(".main-nav")?.classList.remove("is-open");
                document.querySelector(".mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
            }
            if (lightbox.open && shots.length > 1) { if (event.key === "ArrowRight") show(shotIndex + 1); if (event.key === "ArrowLeft") show(shotIndex - 1); }
            if (event.altKey && event.key.toLowerCase() === "h") window.ddGo("index.html");
            if (event.altKey && event.key.toLowerCase() === "p") window.ddGo("projects.html");
        };
        document.addEventListener("keydown", onKeydown);
        window.__ddCleanup.push(() => document.removeEventListener("keydown", onKeydown));

        // Remember audio preferences across pages and browser sessions where possible.
        const audio = document.getElementById("background-audio");
        const volume = document.getElementById("music-volume");
        if (audio && volume && !audio.dataset.ddVolBound) {
            audio.dataset.ddVolBound = "1";
            try {
                const savedVolume = localStorage.getItem("dd-music-volume");
                if (savedVolume !== null) { audio.volume = Math.max(0, Math.min(1, Number(savedVolume))); volume.value = String(Math.round(audio.volume * 100)); }
            } catch {}
            volume.addEventListener("change", () => { try { localStorage.setItem("dd-music-volume", String(audio.volume)); } catch {} });
        }

        // Set the page title's active navigation state on multi-page navigation.
        const currentFile = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
        document.querySelectorAll(".main-nav a").forEach((link) => {
            const target = (link.getAttribute("href") || "").split("#")[0].toLowerCase();
            if (target && target === currentFile) { link.classList.add("active"); link.setAttribute("aria-current", "page"); }
            else if (target) { link.classList.remove("active"); link.removeAttribute("aria-current"); }
        });
    };
    ready(window.ddInitExtra);
})();
