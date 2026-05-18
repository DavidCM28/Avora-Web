document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("main-header");
  const menuButton = document.querySelector(".mobile-menu-btn");
  const themeToggle = document.querySelector(".theme-toggle");
  const themeWipe = document.querySelector(".theme-wipe");
  const navLinks = document.querySelectorAll(".nav-links a");
  const contactForm = document.querySelector(".contact-form[action]");
  const projectGrids = document.querySelectorAll("[data-projects-grid]");
  const serviceGrids = document.querySelectorAll("[data-services-grid]");
  const cmsLoginForm = document.querySelector(".cms-login-form");
  const cmsManager = document.querySelector(".cms-manager");
  const cmsTabs = document.querySelector(".cms-tabs");
  const cmsTabButtons = document.querySelectorAll("[data-cms-tab]");
  const cmsTabPanels = document.querySelectorAll("[data-cms-panel]");
  const cmsProjectList = document.querySelector(".cms-project-list");
  const cmsServiceList = document.querySelector(".cms-service-list");
  const cmsNewProjectButton = document.querySelector(".cms-new-project");
  const cmsNewServiceButton = document.querySelector(".cms-new-service");
  const cmsProjectForm = document.querySelector(".cms-project-form");
  const cmsServiceForm = document.querySelector(".cms-service-form");
  const cmsCancelEditButton = document.querySelector(".cms-cancel-edit");
  const cmsCancelServiceEditButton = document.querySelector(
    ".cms-cancel-service-edit",
  );
  let revealElements = document.querySelectorAll(".reveal");
  let projectCards = document.querySelectorAll(".project-card");
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
    themeToggle.setAttribute(
      "aria-label",
      isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro",
    );
  };

  const syncThemeLogos = () => {
    document.querySelectorAll(".theme-logo").forEach((logo) => {
      const src =
        currentTheme === "light" ? logo.dataset.lightSrc : logo.dataset.darkSrc;
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
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Cerrar menu" : "Abrir menu",
      );
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
      themeWipe.style.setProperty(
        "--active-wipe-color",
        nextTheme === "light"
          ? "rgba(246, 248, 255, 0.56)"
          : "rgba(7, 9, 14, 0.34)",
      );
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

  if (contactForm) {
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const statusMessage = contactForm.querySelector(".form-status");
    const defaultSubmitText = submitButton?.textContent || "Enviar consulta";

    const setFormStatus = (message, type = "") => {
      if (!statusMessage) return;

      statusMessage.textContent = message;
      statusMessage.dataset.status = type;
    };

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!contactForm.reportValidity()) {
        return;
      }

      const formData = new FormData(contactForm);
      const payload = {
        nombre: String(formData.get("nombre") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        servicio: String(formData.get("servicio") || "").trim(),
        mensaje: String(formData.get("mensaje") || "").trim(),
      };

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }

      setFormStatus("Enviando tu consulta...", "loading");

      try {
        const response = await fetch(contactForm.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              "No pudimos enviar tu consulta. Intenta de nuevo.",
          );
        }

        contactForm.reset();
        setFormStatus("Consulta enviada. Te responderemos pronto.", "success");
      } catch (error) {
        setFormStatus(
          error.message || "No pudimos enviar tu consulta. Intenta de nuevo.",
          "error",
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = defaultSubmitText;
        }
      }
    });
  }

  const initProjectCards = () => {
    projectCards = document.querySelectorAll(".project-card");
    if (!projectCards.length) return;

    projectCards.forEach((card) => {
      const toggle = card.querySelector(".project-card-toggle");
      if (!toggle) return;

      toggle.addEventListener("click", () => {
        const isOpen = card.classList.contains("is-open");

        projectCards.forEach((projectCard) => {
          projectCard.classList.remove("is-open");
          projectCard
            .querySelector(".project-card-toggle")
            ?.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          card.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
        }
      });
    });
  };

  const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });

  const renderProjects = async () => {
    if (!projectGrids.length) return;

    try {
      const response = await fetch("proyectos.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No pudimos cargar los proyectos.");

      const projects = await response.json();
      if (!Array.isArray(projects) || !projects.length) {
        projectGrids.forEach((grid) => {
          grid.innerHTML =
            '<p class="projects-empty">Todavia no hay proyectos cargados.</p>';
        });
        return;
      }

      const projectCardMarkup = (project) => {
        const id = `project-${escapeHtml(project.id || project.title || "item")}`;
        const target = project.external
          ? ' target="_blank" rel="noopener"'
          : "";
        const arrow = project.external ? "&nearr;" : "&rarr;";
        const softClass = project.softBackground
          ? " project-logo-wrap-soft"
          : "";
        const themeLogoClass = project.lightImage ? " theme-logo" : "";
        const lightImage = project.lightImage
          ? ` data-light-src="${escapeHtml(project.lightImage)}"`
          : "";
        const darkImage = project.lightImage
          ? ` data-dark-src="${escapeHtml(project.image)}"`
          : "";

        return `
                    <article class="project-card reveal">
                        <button class="project-card-toggle" type="button" aria-expanded="false" aria-controls="${id}">
                            <span class="project-logo-wrap${softClass}">
                                <img src="${escapeHtml(project.image)}"${darkImage}${lightImage} alt="${escapeHtml(project.alt || project.title)}" class="${themeLogoClass.trim()}">
                            </span>
                            <span class="project-card-meta">
                                <span class="project-type">${escapeHtml(project.type)}</span>
                                <strong>${escapeHtml(project.title)}</strong>
                            </span>
                            <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                        <div class="project-detail" id="${id}">
                            <p>${escapeHtml(project.description)}</p>
                            <a href="${escapeHtml(project.url)}"${target} class="btn-text">
                                ${escapeHtml(project.linkLabel || "Visitar sitio")} <span aria-hidden="true">${arrow}</span>
                            </a>
                        </div>
                    </article>
                `;
      };

      projectGrids.forEach((grid) => {
        const category = grid.dataset.projectsGrid;
        const categoryProjects = projects.filter(
          (project) => (project.category || "terceros") === category,
        );

        grid.innerHTML = categoryProjects.length
          ? categoryProjects.map(projectCardMarkup).join("")
          : '<p class="projects-empty">Todavia no hay proyectos en esta categoria.</p>';
      });

      syncThemeLogos();
      initProjectCards();
      initReveal();
    } catch (error) {
      projectGrids.forEach((grid) => {
        grid.innerHTML = `<p class="projects-empty">${escapeHtml(error.message || "No pudimos cargar los proyectos.")}</p>`;
      });
    }
  };

  const listMarkup = (items, className = "service-detail-list") => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    return safeItems.length
      ? `<ul class="${className}">${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "";
  };

  const tagMarkup = (tags) => {
    const safeTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    return safeTags.length
      ? `<div class="tech-tags">${safeTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";
  };

  const serviceVisualMarkup = (service) => {
    const icon = escapeHtml(service.icon || "fa-code");

    return `
    <div class="service-showcase-icon" aria-hidden="true">
      <i class="fa-solid ${icon}"></i>
    </div>
  `;
  };

  const renderServices = async () => {
    if (!serviceGrids.length && !contactForm) return;

    try {
      const response = await fetch("servicios.json", { cache: "no-store" });
      if (!response.ok) throw new Error("No pudimos cargar los servicios.");

      const services = await response.json();
      if (!Array.isArray(services) || !services.length) {
        serviceGrids.forEach((grid) => {
          grid.innerHTML =
            '<p class="projects-empty">Todavia no hay servicios cargados.</p>';
        });
        return;
      }

      const briefMarkup = (service) => `
                <article class="service-card service-card-brief${service.featured ? " featured-service" : ""} reveal">
                    <div class="service-icon" aria-hidden="true">
                        <i class="fa-solid ${escapeHtml(service.icon || "fa-code")}"></i>
                    </div>
                    <span class="service-category">${escapeHtml(service.category || "Servicio")}</span>
                    <h3>${escapeHtml(service.title)}</h3>
                    <p>${escapeHtml(service.summary || service.description)}</p>
                    ${tagMarkup(service.tags)}
                    <a href="servicios.html#${escapeHtml(service.id)}" class="btn-text service-card-link">
                        Ver detalle <span aria-hidden="true">&rarr;</span>
                    </a>
                </article>
            `;

      const detailMarkup = (service, index) => `
                <article class="service-detail-block reveal" id="${escapeHtml(service.id)}">
                    <div class="service-detail-copy">
                        <span class="section-kicker">${escapeHtml(service.category || `Servicio ${index + 1}`)}</span>
                        <h3>${escapeHtml(service.title)}</h3>
                        <p>${escapeHtml(service.description || service.summary)}</p>
                        <div class="service-detail-columns">
                            <div>
                                <strong>Incluye</strong>
                                ${listMarkup(service.highlights)}
                            </div>
                            <div>
                                <strong>Entregables</strong>
                                ${listMarkup(service.deliverables)}
                            </div>
                        </div>
                        ${tagMarkup(service.tags)}
                    </div>
                    ${serviceVisualMarkup(service)}
                </article>
            `;

      const showcaseMarkup = (items) => `
                 <div class="service-switcher reveal is-visible">
                    <div class="service-picker" role="tablist" aria-label="Servicios disponibles">
                        ${items
                          .map(
                            (service, index) => `
                                    <button
                                        class="service-picker-item${index === 0 ? " is-active" : ""}"
                                        type="button"
                                        role="tab"
                                        aria-selected="${index === 0 ? "true" : "false"}"
                                        aria-controls="service-panel-${escapeHtml(service.id)}"
                                        id="service-tab-${escapeHtml(service.id)}"
                                        data-service-index="${index}"
                                    >
                                        <span class="service-picker-icon" aria-hidden="true">
                                            <i class="fa-solid ${escapeHtml(service.icon || "fa-code")}"></i>
                                        </span>
                                        <span>
                                            <strong>${escapeHtml(service.title)}</strong>
                                            <small>${escapeHtml(service.category || "Servicio")}</small>
                                        </span>
                                    </button>
                                `,
                          )
                          .join("")}
                    </div>

                    <div class="service-stage" aria-live="polite">
                        ${items
                          .map(
                            (service, index) => `
                                    <article
                                        class="service-showcase-panel${index === 0 ? " is-active" : ""}"
                                        id="service-panel-${escapeHtml(service.id)}"
                                        role="tabpanel"
                                        aria-labelledby="service-tab-${escapeHtml(service.id)}"
                                        aria-hidden="${index === 0 ? "false" : "true"}"
                                        data-service-index="${index}"
                                    >
                                        <div class="service-showcase-copy">
                                            <div class="service-showcase-meta">
                                                <span class="section-kicker">${escapeHtml(service.category || `Servicio ${index + 1}`)}</span>
                                                <span>${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}</span>
                                            </div>
                                            <h3>${escapeHtml(service.title)}</h3>
                                            <p>${escapeHtml(service.description || service.summary)}</p>
                                            <div class="service-detail-columns">
                                                <div>
                                                    <strong>Incluye</strong>
                                                    ${listMarkup(service.highlights)}
                                                </div>
                                                <div>
                                                    <strong>Entregables</strong>
                                                    ${listMarkup(service.deliverables)}
                                                </div>
                                            </div>
                                            ${tagMarkup(service.tags)}
                                        </div>
                                        ${serviceVisualMarkup(service)}
                                    </article>
                                `,
                          )
                          .join("")}

                        <div class="service-stage-controls" aria-label="Cambiar servicio">
                            <button class="service-stage-btn" type="button" data-service-control="prev" aria-label="Servicio anterior">
                                <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                            </button>
                            <span class="service-stage-count">01 / ${String(items.length).padStart(2, "0")}</span>
                            <button class="service-stage-btn" type="button" data-service-control="next" aria-label="Servicio siguiente">
                                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

      const initServiceShowcase = (grid, items) => {
        const buttons = [
          ...grid.querySelectorAll("[data-service-index].service-picker-item"),
        ];
        const panels = [...grid.querySelectorAll(".service-showcase-panel")];
        const count = grid.querySelector(".service-stage-count");
        if (!buttons.length || !panels.length) return;

        const activateService = (targetIndex, updateHash = true) => {
          const index = (targetIndex + items.length) % items.length;

          buttons.forEach((button, buttonIndex) => {
            const isActive = buttonIndex === index;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
            button.tabIndex = isActive ? 0 : -1;
          });

          panels.forEach((panel, panelIndex) => {
            const isActive = panelIndex === index;
            panel.classList.toggle("is-active", isActive);
            panel.setAttribute("aria-hidden", String(!isActive));
          });

          if (count) {
            count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
          }

          if (updateHash && items[index]?.id) {
            history.replaceState(null, "", `#${items[index].id}`);
          }
        };

        buttons.forEach((button, index) => {
          button.addEventListener("click", () => activateService(index));
          button.addEventListener("keydown", (event) => {
            if (
              ![
                "ArrowUp",
                "ArrowDown",
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
              ].includes(event.key)
            )
              return;

            event.preventDefault();
            let nextIndex = index;
            if (["ArrowDown", "ArrowRight"].includes(event.key))
              nextIndex = index + 1;
            if (["ArrowUp", "ArrowLeft"].includes(event.key))
              nextIndex = index - 1;
            if (event.key === "Home") nextIndex = 0;
            if (event.key === "End") nextIndex = items.length - 1;
            activateService(nextIndex);
            buttons[(nextIndex + items.length) % items.length].focus();
          });
        });

        grid.querySelectorAll("[data-service-control]").forEach((control) => {
          control.addEventListener("click", () => {
            const current = buttons.findIndex((button) =>
              button.classList.contains("is-active"),
            );
            activateService(
              current + (control.dataset.serviceControl === "next" ? 1 : -1),
            );
          });
        });

        const activateFromHash = () => {
          const nextHashIndex = items.findIndex(
            (service) => `#${service.id}` === window.location.hash,
          );
          if (nextHashIndex >= 0) activateService(nextHashIndex, false);
          return nextHashIndex;
        };

        window.addEventListener("hashchange", activateFromHash);

        const hashIndex = activateFromHash();
        if (hashIndex < 0) activateService(0, false);

        if (hashIndex >= 0) {
          window.setTimeout(() => {
            grid.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 120);
        }
      };

      serviceGrids.forEach((grid) => {
        const mode = grid.dataset.servicesGrid;

        if (mode === "detail") {
          grid.innerHTML = showcaseMarkup(services);
          grid.querySelector(".service-switcher")?.classList.add("is-visible");
          initServiceShowcase(grid, services);
          return;
        }

        grid.innerHTML = services.map(briefMarkup).join("");
      });

      const serviceSelect = contactForm?.querySelector(
        'select[name="servicio"]',
      );
      if (serviceSelect) {
        serviceSelect.innerHTML = services
          .map((service) => `<option>${escapeHtml(service.title)}</option>`)
          .join("");
      }

      initReveal();
    } catch (error) {
      serviceGrids.forEach((grid) => {
        grid.innerHTML = `<p class="projects-empty">${escapeHtml(error.message || "No pudimos cargar los servicios.")}</p>`;
      });
    }
  };

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
    },
  );

  const initReveal = () => {
    revealElements = document.querySelectorAll(".reveal:not(.is-visible)");

    revealElements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
      revealObserver.observe(element);
    });
  };

  const wireCmsForms = () => {
    let cmsProjects = [];
    let cmsServices = [];

    const setCmsMode = (mode = "create") => {
      if (!cmsProjectForm) return;

      const heading = cmsProjectForm.querySelector("h2");
      const imageInput = cmsProjectForm.querySelector('input[name="image"]');
      const submitButton = cmsProjectForm.querySelector(
        'button[type="submit"]',
      );
      const statusMessage = cmsProjectForm.querySelector(".form-status");

      cmsProjectForm.dataset.mode = mode;

      if (heading)
        heading.textContent =
          mode === "edit" ? "Editar proyecto" : "Nuevo proyecto";
      if (imageInput) imageInput.required = mode !== "edit";
      if (submitButton)
        submitButton.textContent =
          mode === "edit" ? "Actualizar proyecto" : "Guardar proyecto";
      if (cmsCancelEditButton) cmsCancelEditButton.hidden = mode !== "edit";
      if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.dataset.status = "";
      }
    };

    const clearCmsForm = () => {
      if (!cmsProjectForm) return;

      cmsProjectForm.reset();
      cmsProjectForm.elements.projectId.value = "";
      setCmsMode("create");
    };

    const splitLines = (value) =>
      String(value || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

    const joinLines = (value) => (Array.isArray(value) ? value.join("\n") : "");

    const activateCmsTab = (target = "services") => {
      if (!cmsTabs) return;

      cmsTabButtons.forEach((button) => {
        const isActive = button.dataset.cmsTab === target;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      });

      cmsTabPanels.forEach((panel) => {
        panel.hidden = panel.dataset.cmsPanel !== target;
      });
    };

    const fillCmsForm = (project) => {
      if (!cmsProjectForm) return;

      activateCmsTab("projects");
      cmsProjectForm.elements.projectId.value = project.id || "";
      cmsProjectForm.elements.title.value = project.title || "";
      cmsProjectForm.elements.type.value = project.type || "";
      cmsProjectForm.elements.category.value = project.category || "terceros";
      cmsProjectForm.elements.description.value = project.description || "";
      cmsProjectForm.elements.url.value = project.url || "";
      cmsProjectForm.elements.linkLabel.value = project.linkLabel || "";
      cmsProjectForm.elements.alt.value = project.alt || "";
      cmsProjectForm.elements.softBackground.checked = Boolean(
        project.softBackground,
      );
      cmsProjectForm.elements.image.value = "";
      setCmsMode("edit");
      cmsProjectForm.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const renderCmsProjectList = () => {
      if (!cmsProjectList) return;

      if (!cmsProjects.length) {
        cmsProjectList.innerHTML =
          '<p class="projects-empty">Todavia no hay proyectos cargados.</p>';
        return;
      }

      const categories = [
        {
          id: "terceros",
          title: "Proyectos a terceros",
          copy: "Empresas que eligieron nuestro servicio para construir productos digitales.",
        },
        {
          id: "avora",
          title: "Proyectos propios de Avora",
          copy: "Productos y presencia digital disenados con el mismo estandar que ofrecemos.",
        },
      ];

      const rowMarkup = (project) => `
                        <article class="cms-project-row" data-project-id="${escapeHtml(project.id)}">
                            <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.alt || project.title)}">
                            <div>
                                <strong>${escapeHtml(project.title)}</strong>
                                <span>${escapeHtml(project.type)}</span>
                            </div>
                            <div class="cms-row-actions">
                                <button class="cms-icon-btn" type="button" data-action="edit" aria-label="Editar ${escapeHtml(project.title)}">
                                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                                </button>
                                <button class="cms-icon-btn" type="button" data-action="delete" aria-label="Eliminar ${escapeHtml(project.title)}">
                                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                                </button>
                            </div>
                        </article>
                    `;

      cmsProjectList.innerHTML = categories
        .map((category) => {
          const items = cmsProjects.filter(
            (project) => (project.category || "terceros") === category.id,
          );

          return `
                        <section class="cms-project-group">
                            <div class="cms-project-group-heading">
                                <div>
                                    <strong>${category.title}</strong>
                                    <p>${category.copy}</p>
                                </div>
                                <span>${items.length}</span>
                            </div>
                            <div class="cms-project-group-list">
                                ${items.length ? items.map(rowMarkup).join("") : '<p class="projects-empty">Sin proyectos en esta categoria.</p>'}
                            </div>
                        </section>
                    `;
        })
        .join("");
    };

    const setCmsServiceMode = (mode = "create") => {
      if (!cmsServiceForm) return;

      const heading = cmsServiceForm.querySelector("h2");
      const submitButton = cmsServiceForm.querySelector(
        'button[type="submit"]',
      );
      const statusMessage = cmsServiceForm.querySelector(".form-status");

      cmsServiceForm.dataset.mode = mode;

      if (heading)
        heading.textContent =
          mode === "edit" ? "Editar servicio" : "Nuevo servicio";
      if (submitButton)
        submitButton.textContent =
          mode === "edit" ? "Actualizar servicio" : "Guardar servicio";
      if (cmsCancelServiceEditButton)
        cmsCancelServiceEditButton.hidden = mode !== "edit";
      if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.dataset.status = "";
      }
    };

    const clearCmsServiceForm = () => {
      if (!cmsServiceForm) return;

      cmsServiceForm.reset();
      cmsServiceForm.elements.serviceId.value = "";
      setCmsServiceMode("create");
    };

    const fillCmsServiceForm = (service) => {
      if (!cmsServiceForm) return;

      activateCmsTab("services");
      cmsServiceForm.elements.serviceId.value = service.id || "";
      cmsServiceForm.elements.title.value = service.title || "";
      cmsServiceForm.elements.icon.value = service.icon || "fa-code";
      cmsServiceForm.elements.category.value = service.category || "";
      cmsServiceForm.elements.summary.value = service.summary || "";
      cmsServiceForm.elements.description.value = service.description || "";
      cmsServiceForm.elements.highlights.value = joinLines(service.highlights);
      cmsServiceForm.elements.deliverables.value = joinLines(
        service.deliverables,
      );
      cmsServiceForm.elements.tags.value = Array.isArray(service.tags)
        ? service.tags.join(", ")
        : "";
      cmsServiceForm.elements.animation.value = service.animation || "orbit";
      cmsServiceForm.elements.featured.checked = Boolean(service.featured);
      setCmsServiceMode("edit");
      cmsServiceForm.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const renderCmsServiceList = () => {
      if (!cmsServiceList) return;

      if (!cmsServices.length) {
        cmsServiceList.innerHTML =
          '<p class="projects-empty">Todavia no hay servicios cargados.</p>';
        return;
      }

      cmsServiceList.innerHTML = cmsServices
        .map(
          (service) => `
                        <article class="cms-project-row cms-service-row" data-service-id="${escapeHtml(service.id)}">
                            <div class="cms-service-icon" aria-hidden="true">
                                <i class="fa-solid ${escapeHtml(service.icon || "fa-code")}"></i>
                            </div>
                            <div>
                                <strong>${escapeHtml(service.title)}</strong>
                                <span>${escapeHtml(service.category || "Servicio")}</span>
                            </div>
                            <div class="cms-row-actions">
                                <button class="cms-icon-btn" type="button" data-service-action="edit" aria-label="Editar ${escapeHtml(service.title)}">
                                    <i class="fa-solid fa-pen" aria-hidden="true"></i>
                                </button>
                                <button class="cms-icon-btn" type="button" data-service-action="delete" aria-label="Eliminar ${escapeHtml(service.title)}">
                                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                                </button>
                            </div>
                        </article>
                    `,
        )
        .join("");
    };

    const loadCmsProjects = async () => {
      if (!cmsManager || !cmsProjectList) return;

      cmsProjectList.innerHTML =
        '<p class="projects-empty">Cargando proyectos...</p>';

      try {
        const response = await fetch("/api/proyectos", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(result.message || "No pudimos cargar los proyectos.");

        cmsProjects = Array.isArray(result.projects) ? result.projects : [];
        renderCmsProjectList();
      } catch (error) {
        cmsProjectList.innerHTML = `<p class="projects-empty">${escapeHtml(error.message || "No pudimos cargar los proyectos.")}</p>`;
      }
    };

    const loadCmsServices = async () => {
      if (!cmsManager || !cmsServiceList) return;

      cmsServiceList.innerHTML =
        '<p class="projects-empty">Cargando servicios...</p>';

      try {
        const response = await fetch("/api/servicios", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(result.message || "No pudimos cargar los servicios.");

        cmsServices = Array.isArray(result.services) ? result.services : [];
        renderCmsServiceList();
      } catch (error) {
        cmsServiceList.innerHTML = `<p class="projects-empty">${escapeHtml(error.message || "No pudimos cargar los servicios.")}</p>`;
      }
    };

    const revealCmsManager = async () => {
      if (cmsLoginForm) cmsLoginForm.hidden = true;
      if (cmsTabs) cmsTabs.hidden = false;
      activateCmsTab("services");
      clearCmsForm();
      clearCmsServiceForm();
      await loadCmsProjects();
      await loadCmsServices();
    };

    if (cmsLoginForm) {
      const statusMessage = cmsLoginForm.querySelector(".form-status");
      const submitButton = cmsLoginForm.querySelector('button[type="submit"]');

      cmsLoginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const password = String(
          new FormData(cmsLoginForm).get("password") || "",
        );
        statusMessage.textContent = "Validando acceso...";
        statusMessage.dataset.status = "loading";
        submitButton.disabled = true;

        try {
          const response = await fetch("/api/cms/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(result.message || "No pudimos validar el acceso.");

          await revealCmsManager();
        } catch (error) {
          statusMessage.textContent =
            error.message || "No pudimos validar el acceso.";
          statusMessage.dataset.status = "error";
        } finally {
          submitButton.disabled = false;
        }
      });
    }

    if (cmsTabButtons.length) {
      cmsTabButtons.forEach((button, index) => {
        button.addEventListener("click", () =>
          activateCmsTab(button.dataset.cmsTab || "services"),
        );
        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;

          event.preventDefault();

          const lastIndex = cmsTabButtons.length - 1;
          let nextIndex = index;
          if (event.key === "ArrowRight")
            nextIndex = index === lastIndex ? 0 : index + 1;
          if (event.key === "ArrowLeft")
            nextIndex = index === 0 ? lastIndex : index - 1;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = lastIndex;

          const nextButton = cmsTabButtons[nextIndex];
          activateCmsTab(nextButton.dataset.cmsTab || "services");
          nextButton.focus();
        });
      });
    }

    if (cmsProjectList) {
      cmsProjectList.addEventListener("click", async (event) => {
        const actionButton = event.target.closest("[data-action]");
        if (!actionButton) return;

        const row = actionButton.closest("[data-project-id]");
        const projectId = row?.dataset.projectId;
        const project = cmsProjects.find((item) => item.id === projectId);
        if (!project) return;

        if (actionButton.dataset.action === "edit") {
          fillCmsForm(project);
          return;
        }

        if (actionButton.dataset.action === "delete") {
          const confirmed = window.confirm(
            `Eliminar "${project.title}" del portafolio?`,
          );
          if (!confirmed) return;

          actionButton.disabled = true;

          try {
            const response = await fetch(
              `/api/proyectos/${encodeURIComponent(project.id)}`,
              {
                method: "DELETE",
              },
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok)
              throw new Error(
                result.message || "No pudimos eliminar el proyecto.",
              );

            if (cmsProjectForm?.elements.projectId.value === project.id) {
              clearCmsForm();
            }

            await loadCmsProjects();
          } catch (error) {
            window.alert(error.message || "No pudimos eliminar el proyecto.");
          } finally {
            actionButton.disabled = false;
          }
        }
      });
    }

    if (cmsServiceList) {
      cmsServiceList.addEventListener("click", async (event) => {
        const actionButton = event.target.closest("[data-service-action]");
        if (!actionButton) return;

        const row = actionButton.closest("[data-service-id]");
        const serviceId = row?.dataset.serviceId;
        const service = cmsServices.find((item) => item.id === serviceId);
        if (!service) return;

        if (actionButton.dataset.serviceAction === "edit") {
          fillCmsServiceForm(service);
          return;
        }

        if (actionButton.dataset.serviceAction === "delete") {
          const confirmed = window.confirm(
            `Eliminar "${service.title}" de servicios?`,
          );
          if (!confirmed) return;

          actionButton.disabled = true;

          try {
            const response = await fetch(
              `/api/servicios/${encodeURIComponent(service.id)}`,
              {
                method: "DELETE",
              },
            );
            const result = await response.json().catch(() => ({}));
            if (!response.ok)
              throw new Error(
                result.message || "No pudimos eliminar el servicio.",
              );

            if (cmsServiceForm?.elements.serviceId.value === service.id) {
              clearCmsServiceForm();
            }

            await loadCmsServices();
          } catch (error) {
            window.alert(error.message || "No pudimos eliminar el servicio.");
          } finally {
            actionButton.disabled = false;
          }
        }
      });
    }

    if (cmsNewProjectButton) {
      cmsNewProjectButton.addEventListener("click", () => {
        activateCmsTab("projects");
        clearCmsForm();
        cmsProjectForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (cmsNewServiceButton) {
      cmsNewServiceButton.addEventListener("click", () => {
        activateCmsTab("services");
        clearCmsServiceForm();
        cmsServiceForm?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (cmsCancelEditButton) {
      cmsCancelEditButton.addEventListener("click", clearCmsForm);
    }

    if (cmsCancelServiceEditButton) {
      cmsCancelServiceEditButton.addEventListener("click", clearCmsServiceForm);
    }

    if (cmsProjectForm) {
      const statusMessage = cmsProjectForm.querySelector(".form-status");
      const submitButton = cmsProjectForm.querySelector(
        'button[type="submit"]',
      );

      cmsProjectForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!cmsProjectForm.reportValidity()) return;

        const projectId = String(cmsProjectForm.elements.projectId.value || "");
        const isEditing = Boolean(projectId);

        statusMessage.textContent = isEditing
          ? "Actualizando proyecto..."
          : "Guardando proyecto...";
        statusMessage.dataset.status = "loading";
        submitButton.disabled = true;
        submitButton.textContent = isEditing
          ? "Actualizando..."
          : "Guardando...";

        try {
          const response = await fetch(
            isEditing
              ? `/api/proyectos/${encodeURIComponent(projectId)}`
              : "/api/proyectos",
            {
              method: isEditing ? "PUT" : "POST",
              body: new FormData(cmsProjectForm),
            },
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(
              result.message || "No pudimos guardar el proyecto.",
            );

          clearCmsForm();
          statusMessage.textContent = isEditing
            ? "Proyecto actualizado."
            : "Proyecto guardado y agregado al portafolio.";
          statusMessage.dataset.status = "success";
          await loadCmsProjects();
        } catch (error) {
          statusMessage.textContent =
            error.message || "No pudimos guardar el proyecto.";
          statusMessage.dataset.status = "error";
        } finally {
          submitButton.disabled = false;
          submitButton.textContent =
            cmsProjectForm.dataset.mode === "edit"
              ? "Actualizar proyecto"
              : "Guardar proyecto";
        }
      });
    }

    if (cmsServiceForm) {
      const statusMessage = cmsServiceForm.querySelector(".form-status");
      const submitButton = cmsServiceForm.querySelector(
        'button[type="submit"]',
      );

      cmsServiceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!cmsServiceForm.reportValidity()) return;

        const serviceId = String(cmsServiceForm.elements.serviceId.value || "");
        const isEditing = Boolean(serviceId);
        const formData = new FormData(cmsServiceForm);
        const payload = {
          title: String(formData.get("title") || "").trim(),
          icon: String(formData.get("icon") || "fa-code").trim(),
          category: String(formData.get("category") || "").trim(),
          summary: String(formData.get("summary") || "").trim(),
          description: String(formData.get("description") || "").trim(),
          highlights: splitLines(formData.get("highlights")),
          deliverables: splitLines(formData.get("deliverables")),
          tags: String(formData.get("tags") || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          animation: String(formData.get("animation") || "orbit").trim(),
          featured: formData.get("featured") === "on",
        };

        statusMessage.textContent = isEditing
          ? "Actualizando servicio..."
          : "Guardando servicio...";
        statusMessage.dataset.status = "loading";
        submitButton.disabled = true;
        submitButton.textContent = isEditing
          ? "Actualizando..."
          : "Guardando...";

        try {
          const response = await fetch(
            isEditing
              ? `/api/servicios/${encodeURIComponent(serviceId)}`
              : "/api/servicios",
            {
              method: isEditing ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(
              result.message || "No pudimos guardar el servicio.",
            );

          clearCmsServiceForm();
          statusMessage.textContent = isEditing
            ? "Servicio actualizado."
            : "Servicio guardado.";
          statusMessage.dataset.status = "success";
          await loadCmsServices();
        } catch (error) {
          statusMessage.textContent =
            error.message || "No pudimos guardar el servicio.";
          statusMessage.dataset.status = "error";
        } finally {
          submitButton.disabled = false;
          submitButton.textContent =
            cmsServiceForm.dataset.mode === "edit"
              ? "Actualizar servicio"
              : "Guardar servicio";
        }
      });
    }
  };

  renderProjects();
  renderServices();
  initProjectCards();
  initReveal();
  wireCmsForms();

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
      { passive: true },
    );

    const animateCursorLight = () => {
      cursorLight.currentX +=
        (cursorLight.targetX - cursorLight.currentX) * 0.12;
      cursorLight.currentY +=
        (cursorLight.targetY - cursorLight.currentY) * 0.12;

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

        const targetCount = Math.min(
          190,
          Math.max(82, Math.floor((width * height) / 10500)),
        );
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
        const x =
          particle.baseX +
          Math.cos(angleFromCursor) * push +
          Math.cos(particle.angle + time * particle.speed) * orbital;
        const y =
          particle.baseY +
          Math.sin(angleFromCursor) * push +
          Math.sin(particle.angle + time * particle.speed) * orbital;
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
