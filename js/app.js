document.addEventListener("DOMContentLoaded", () => {
    const header = document.getElementById("main-header");
    const menuButton = document.querySelector(".mobile-menu-btn");
    const themeToggle = document.querySelector(".theme-toggle");
    const themeWipe = document.querySelector(".theme-wipe");
    const navLinks = document.querySelectorAll(".nav-links a");
    const themeLogos = document.querySelectorAll(".theme-logo");
    const revealElements = document.querySelectorAll(".reveal");
    const heroTitle = document.querySelector(".hero-title[data-typewriter]");
    const heroVisual = document.querySelector(".hero-visual");
    const particleCanvas = document.querySelector(".particle-field");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cursorLight = {
        targetX: window.innerWidth / 2,
        targetY: window.innerHeight * 0.18,
        currentX: window.innerWidth / 2,
        currentY: window.innerHeight * 0.18,
        active: false,
    };
    const particlePalettes = {
        dark: ["#3b82f6", "#8bb8ff", "#ffffff", "#a1a1aa"],
        light: ["#3b82f6", "#1d4ed8", "#0b0f19", "#8b95a7"],
    };
    let currentTheme = localStorage.getItem("avora-theme") || "dark";
    if (!["dark", "light"].includes(currentTheme)) currentTheme = "dark";
    let recolorParticles = () => {};

    const syncThemeToggle = () => {
        if (!themeToggle) return;

        const isLight = currentTheme === "light";
        themeToggle.setAttribute("aria-pressed", String(isLight));
        themeToggle.setAttribute("aria-label", isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
    };

    const syncThemeLogos = () => {
        themeLogos.forEach((logo) => {
            const src = currentTheme === "light" ? logo.dataset.lightSrc : logo.dataset.darkSrc;
            if (src && logo.getAttribute("src") !== src) {
                logo.src = src;
            }
        });
    };

    const applyTheme = (theme) => {
        currentTheme = theme;
        document.body.dataset.theme = theme;
        localStorage.setItem("avora-theme", theme);
        syncThemeToggle();
        syncThemeLogos();
        recolorParticles();
    };

    applyTheme(currentTheme);

    const updateHeader = () => {
        header.classList.toggle("scrolled", window.scrollY > 24);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    if (menuButton) {
        menuButton.addEventListener("click", () => {
            const isOpen = document.body.classList.toggle("menu-open");
            menuButton.setAttribute("aria-expanded", String(isOpen));
            menuButton.setAttribute("aria-label", isOpen ? "Cerrar menu" : "Abrir menu");
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            document.body.classList.remove("menu-open");
            menuButton?.setAttribute("aria-expanded", "false");
            menuButton?.setAttribute("aria-label", "Abrir menu");
        });
    });

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const nextTheme = currentTheme === "dark" ? "light" : "dark";

            if (motionQuery.matches || !themeWipe) {
                applyTheme(nextTheme);
                return;
            }

            themeToggle.disabled = true;
            themeWipe.style.setProperty("--active-wipe-color", nextTheme === "light" ? "rgba(246, 248, 255, 0.56)" : "rgba(7, 9, 14, 0.34)");
            document.body.classList.add("theme-transition");
            themeWipe.classList.remove("is-wiping");
            void themeWipe.offsetWidth;
            themeWipe.classList.add("is-wiping");
            applyTheme(nextTheme);

            window.setTimeout(() => {
                themeWipe.classList.remove("is-wiping");
                themeWipe.style.removeProperty("--active-wipe-color");
                document.body.classList.remove("theme-transition");
                themeToggle.disabled = false;
            }, 1380);
        });
    }

    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.18,
            rootMargin: "0px 0px -70px 0px",
        }
    );

    revealElements.forEach((element, index) => {
        element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
        revealObserver.observe(element);
    });

    const runTypewriter = () => {
        if (!heroTitle) return;

        const text = heroTitle.textContent.trim();
        heroTitle.dataset.typewriterText = text;
        heroTitle.style.minHeight = `${Math.ceil(heroTitle.getBoundingClientRect().height)}px`;

        if (motionQuery.matches) {
            heroTitle.textContent = text;
            return;
        }

        heroTitle.textContent = "";
        heroTitle.classList.add("is-typing");

        let index = 0;
        const typeNext = () => {
            heroTitle.textContent = text.slice(0, index);
            index += 1;

            if (index <= text.length) {
                const currentChar = text[index - 2] || "";
                const delay = currentChar === " " ? 34 : 58 + Math.random() * 32;
                window.setTimeout(typeNext, delay);
                return;
            }

            heroTitle.classList.remove("is-typing");
            heroTitle.classList.add("is-typed");
        };

        window.setTimeout(typeNext, 420);
    };

    runTypewriter();

    if (!motionQuery.matches) {
        window.addEventListener(
            "pointermove",
            (event) => {
                cursorLight.targetX = event.clientX;
                cursorLight.targetY = event.clientY;
                cursorLight.active = true;

                if (heroVisual) {
                    const x = (event.clientX / window.innerWidth - 0.5) * 16;
                    const y = (event.clientY / window.innerHeight - 0.5) * -16;

                    heroVisual.style.setProperty("--tilt-x", `${y}deg`);
                    heroVisual.style.setProperty("--tilt-y", `${x}deg`);
                }
            },
            { passive: true }
        );

        const animateCursorLight = () => {
            cursorLight.currentX += (cursorLight.targetX - cursorLight.currentX) * 0.12;
            cursorLight.currentY += (cursorLight.targetY - cursorLight.currentY) * 0.12;

            requestAnimationFrame(animateCursorLight);
        };

        animateCursorLight();

        if (particleCanvas) {
            const ctx = particleCanvas.getContext("2d");
            let colors = particlePalettes[currentTheme];
            const particles = [];
            let width = 0;
            let height = 0;
            let dpr = 1;

            const resetParticle = (particle, randomize = true) => {
                particle.x = randomize ? Math.random() * width : particle.baseX;
                particle.y = randomize ? Math.random() * height : particle.baseY;
                particle.baseX = particle.x;
                particle.baseY = particle.y;
                particle.size = 1.2 + Math.random() * 2.8;
                particle.speed = 0.002 + Math.random() * 0.006;
                particle.phase = Math.random() * Math.PI * 2;
                particle.angle = Math.random() * Math.PI * 2;
                particle.color = colors[Math.floor(Math.random() * colors.length)];
                particle.alpha = 0.18 + Math.random() * 0.55;
            };

            recolorParticles = () => {
                colors = particlePalettes[currentTheme];
                particles.forEach((particle) => {
                    particle.color = colors[Math.floor(Math.random() * colors.length)];
                });
            };

            const resizeParticles = () => {
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                width = window.innerWidth;
                height = window.innerHeight;
                particleCanvas.width = Math.floor(width * dpr);
                particleCanvas.height = Math.floor(height * dpr);
                particleCanvas.style.width = `${width}px`;
                particleCanvas.style.height = `${height}px`;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

                const targetCount = Math.min(190, Math.max(82, Math.floor((width * height) / 10500)));
                particles.length = 0;

                for (let i = 0; i < targetCount; i += 1) {
                    const particle = {};
                    resetParticle(particle);
                    particles.push(particle);
                }
            };

            const drawParticle = (particle, time) => {
                const dx = particle.baseX - cursorLight.currentX;
                const dy = particle.baseY - cursorLight.currentY;
                const distance = Math.hypot(dx, dy);
                const influence = Math.max(0, 1 - distance / 420);
                const angleFromCursor = Math.atan2(dy, dx);
                const orbital = Math.sin(time * particle.speed + particle.phase) * 7;
                const push = influence * influence * 180;
                const x = particle.baseX + Math.cos(angleFromCursor) * push + Math.cos(particle.angle + time * particle.speed) * orbital;
                const y = particle.baseY + Math.sin(angleFromCursor) * push + Math.sin(particle.angle + time * particle.speed) * orbital;
                const alpha = particle.alpha * (0.36 + influence * 1.35);
                const radius = particle.size * (1 + influence * 1.4);

                ctx.save();
                ctx.globalAlpha = Math.min(alpha, 0.95);
                ctx.fillStyle = particle.color;
                ctx.shadowColor = particle.color;
                ctx.shadowBlur = 7 + influence * 16;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            };

            const animateParticles = (time = 0) => {
                ctx.clearRect(0, 0, width, height);
                particles.forEach((particle) => drawParticle(particle, time));
                requestAnimationFrame(animateParticles);
            };

            resizeParticles();
            window.addEventListener("resize", resizeParticles, { passive: true });
            animateParticles();
        }
    }
});
