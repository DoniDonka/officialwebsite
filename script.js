
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

    // Try to start music automatically. Browsers generally require autoplay to be muted;
    // visitors can enable sound with the player control.
    const audio = document.getElementById("background-audio");
    const playButton = document.getElementById("music-play-button");
    const playSymbol = playButton?.querySelector(".music-play-symbol");
    const musicStatus = document.getElementById("music-status");
    const seek = document.getElementById("music-seek");
    const currentTimeLabel = document.getElementById("music-current-time");
    const durationLabel = document.getElementById("music-duration");
    const volume = document.getElementById("music-volume");

    if (audio && playButton && playSymbol && musicStatus && seek &&
        currentTimeLabel && durationLabel && volume) {
        audio.volume = Number(volume.value) / 100;
        audio.muted = true;
        playSymbol.textContent = "♪";
        playButton.setAttribute("aria-label", "Enable background music");
        musicStatus.textContent = "starting quietly · enable sound with the volume control";

        const formatTime = (seconds) => {
            if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return minutes + ":" + String(remainingSeconds).padStart(2, "0");
        };

        const updatePlaybackUI = () => {
            const playing = !audio.paused;
            playSymbol.textContent = playing ? "Ⅱ" : "▶";
            playButton.classList.toggle("is-playing", playing);
            playButton.setAttribute("aria-pressed", String(playing));
            playButton.setAttribute(
                "aria-label",
                playing ? "Pause background music" : "Play background music"
            );

            if (audio.error) {
                musicStatus.textContent = "audio file unavailable";
            } else if (playing && audio.muted) {
                musicStatus.textContent = "playing quietly · raise sound to listen";
            } else if (playing) {
                musicStatus.textContent = "now playing";
            } else {
                musicStatus.textContent = "tap play to start";
            }
        };

        playButton.addEventListener("click", async () => {
            if (!audio.paused && audio.muted) {
                audio.muted = false;
                audio.volume = Math.max(Number(volume.value) / 100, 0.15);
                updatePlaybackUI();
                return;
            }
            if (!audio.paused) {
                audio.pause();
                return;
            }

            musicStatus.textContent = "loading audio…";
            audio.muted = false;
            audio.volume = Math.max(Number(volume.value) / 100, 0.15);

            try {
                await audio.play();
            } catch (error) {
                // Retry muted; browsers may allow muted autoplay even when sound is blocked.
                audio.muted = true;
                try {
                    await audio.play();
                } catch (retryError) {
                    musicStatus.textContent = "audio file unavailable";
                    console.warn("Background audio could not be played.", retryError);
                }
            }
            updatePlaybackUI();
        });

        audio.addEventListener("play", updatePlaybackUI);
        audio.addEventListener("pause", updatePlaybackUI);
        audio.addEventListener("ended", updatePlaybackUI);

        audio.addEventListener("error", () => {
            musicStatus.textContent = "audio file unavailable";
            updatePlaybackUI();
        });

        audio.addEventListener("loadedmetadata", () => {
            durationLabel.textContent = formatTime(audio.duration);
        });

        audio.addEventListener("timeupdate", () => {
            currentTimeLabel.textContent = formatTime(audio.currentTime);

            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                seek.value = String((audio.currentTime / audio.duration) * 100);
            }
        });

        seek.addEventListener("input", () => {
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
                audio.currentTime = (Number(seek.value) / 100) * audio.duration;
            }
        });

        volume.addEventListener("input", () => {
            audio.volume = Number(volume.value) / 100;
            audio.muted = audio.volume === 0;
            if (audio.volume > 0 && !audio.paused) {
                audio.muted = false;
            }
            updatePlaybackUI();
        });

        // Attempt autoplay on page load. Audible autoplay may be blocked by browser policy.
        audio.play().then(() => {
            musicStatus.textContent = "playing quietly · enable sound with the volume control";
        }).catch(() => {
            musicStatus.textContent = "autoplay blocked · tap play to start";
        });

        updatePlaybackUI();
    }
});
