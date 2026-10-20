
"use strict";

document.addEventListener("DOMContentLoaded", () => {
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
        window.setInterval(updateClock, 1000);
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
        player.innerHTML = '<audio id="background-audio" preload="auto" autoplay loop><source src="assets/moog-city.mp3" type="audio/mpeg"></audio><button class="music-play-button" id="music-play-button" type="button" aria-label="play background music" aria-pressed="false"><span class="music-play-symbol" aria-hidden="true">▶</span></button><div class="music-details"><p class="music-eyebrow">music</p><p class="music-title">moog city <span>· slowed + reverb</span></p><p class="music-status" id="music-status" aria-live="polite">tap play if your browser blocks autoplay</p><div class="music-timeline"><span class="music-time" id="music-current-time">0:00</span><input class="music-seek" id="music-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="seek through music"><span class="music-time" id="music-duration">0:00</span></div></div><label class="music-volume-control"><span class="visually-hidden">music volume</span><span class="volume-symbol" aria-hidden="true">volume</span><input id="music-volume" type="range" min="0" max="100" value="30" aria-label="music volume"></label>';
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
    if (audio && playButton && playSymbol && musicStatus && seek && currentTimeLabel && durationLabel && volume) {
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
});
