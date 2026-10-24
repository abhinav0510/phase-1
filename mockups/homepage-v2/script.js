/* Sidana Labs homepage mockup v3 — motion layer. No dependencies.
   Everything degrades to a static page under prefers-reduced-motion. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- Ready: play the load-in once fonts are available ---------------- */
  const ready = () => document.body.classList.add("is-ready");
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready);
  setTimeout(ready, 900); // never wait on a slow font

  /* ---------------- Menu (circular reveal) ---------------- */
  const menu = $("#menu"), menuBtn = $("#menuBtn");
  const setMenu = (open) => {
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.documentElement.style.overflow = open ? "hidden" : "";
  };
  menuBtn.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("open")) setMenu(false); });

  /* ---------------- Colour wipe for in-page navigation ---------------- */
  const wipe = $(".wipe");
  let wiping = false;
  const header = $(".site-header");
  const jumpTo = (hash) => {
    const el = document.querySelector(hash);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: "instant" });
  };
  $$("a[data-wipe]").forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;
      e.preventDefault();
      if (menu.classList.contains("open")) setMenu(false);
      if (reduce || wiping) { jumpTo(hash); return; }
      wiping = true;
      wipe.classList.remove("out"); wipe.classList.add("in");
      setTimeout(() => {
        jumpTo(hash);
        wipe.classList.remove("in"); wipe.classList.add("out");
        setTimeout(() => { wipe.classList.remove("out"); wiping = false; }, 600);
      }, 580);
    });
  });

  /* ---------------- Hero runway: scroll progress drives CSS (--p) ---------------- */
  const runway = $(".hero-runway"), sticky = $(".hero-sticky");
  $$(".art").forEach((a) => {
    a.style.setProperty("--depth", a.dataset.depth || "0.5");
    a.style.setProperty("--x", a.dataset.x || "1");
  });
  $$(".art-chart i").forEach((b, i) => b.style.setProperty("--i", i));

  let heroVisible = true, ticking = false;
  const updateHero = () => {
    ticking = false;
    const span = runway.offsetHeight - window.innerHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    sticky.style.setProperty("--p", p.toFixed(4));
    header.classList.toggle("past-hero", p > 0.92);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(updateHero); } };
  if (!reduce) { window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); updateHero(); }
  else header.classList.remove("past-hero");

  /* ---------------- Film grain (low-res noise, ~24 fps, paused off-screen) ---------------- */
  const grain = $(".grain");
  if (grain && !reduce) {
    const ctx = grain.getContext("2d", { alpha: true });
    let w = 0, h = 0, img, last = 0, raf = 0, running = false;
    const SCALE = 0.33;
    const resize = () => {
      w = Math.max(1, Math.round(sticky.clientWidth * SCALE));
      h = Math.max(1, Math.round(sticky.clientHeight * SCALE));
      grain.width = w; grain.height = h;
      img = ctx.createImageData(w, h);
    };
    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 42) return; // ~24 fps is plenty for grain
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 46;
      }
      ctx.putImageData(img, 0, 0);
    };
    const start = () => { if (!running && heroVisible && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
    const stop = () => { if (running) { cancelAnimationFrame(raf); running = false; } };
    resize(); start();
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    new IntersectionObserver((en) => { heroVisible = en[0].isIntersecting; heroVisible ? start() : stop(); }, { threshold: 0.02 }).observe(runway);
  }

  /* ---------------- Frosted prompt: glow follows the cursor ---------------- */
  const frosted = $("#heroPrompt");
  if (frosted) {
    frosted.addEventListener("pointermove", (e) => {
      const r = frosted.getBoundingClientRect();
      frosted.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      frosted.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  }

  /* ---------------- Scroll reveals (+ immediate reveal for anything already on screen) ---------------- */
  const revealed = (el) => {
    el.classList.add("in-view");
    if (el.classList.contains("dcard-stat")) countUp(el.querySelector(".dnum"));
  };
  const targets = $$(".reveal, .reveal-lines, .band, .dots");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { revealed(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top < window.innerHeight && top > -el.offsetHeight) revealed(el); else io.observe(el);
    });
  } else {
    targets.forEach(revealed);
  }

  function countUp(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = "1";
    const target = Number(el.dataset.count || 0);
    const fmt = new Intl.NumberFormat("en-IN");
    if (reduce) { el.textContent = fmt.format(target); return; }
    const t0 = performance.now(), dur = 1500;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------------- Help rows: the one nearest the viewport's focal line lights up ---------------- */
  const rows = $$(".help-row");
  if (rows.length) {
    let rowTick = false;
    const focusRow = () => {
      rowTick = false;
      const focal = window.innerHeight * 0.5;
      let best = null, bestD = Infinity;
      rows.forEach((r) => {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - focal);
        if (d < bestD) { bestD = d; best = r; }
      });
      rows.forEach((r) => r.classList.toggle("is-focus", r === best));
    };
    if (reduce) rows.forEach((r) => r.classList.add("is-focus"));
    else {
      window.addEventListener("scroll", () => { if (!rowTick) { rowTick = true; requestAnimationFrame(focusRow); } }, { passive: true });
      focusRow();
    }
  }

  /* ---------------- Decorative generators: dot grid + barcode band ---------------- */
  const dots = $(".dots");
  if (dots) {
    for (let i = 0; i < 72; i++) {
      const d = document.createElement("i");
      d.style.setProperty("--d", `${(i % 12) * 0.04 + Math.floor(i / 12) * 0.06}s`);
      dots.appendChild(d);
    }
  }
  const band = $("#band");
  if (band) {
    const n = Math.max(40, Math.min(120, Math.round(window.innerWidth / 11)));
    for (let i = 0; i < n; i++) {
      const b = document.createElement("i");
      const tall = Math.random() < 0.18;
      b.style.setProperty("--h", `${tall ? 70 + Math.random() * 30 : 20 + Math.random() * 45}%`);
      b.style.setProperty("--d", `${Math.min(0.9, i * 0.008)}s`);
      band.appendChild(b);
    }
  }

  /* ---------------- Mandate visuals tilt toward the cursor ---------------- */
  $$(".tilt").forEach((wrap) => {
    const ui = wrap.querySelector(".ui");
    if (!ui || reduce) return;
    wrap.addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      ui.style.setProperty("--ry", `${px * 10}deg`);
      ui.style.setProperty("--rx", `${-py * 8}deg`);
    });
    wrap.addEventListener("pointerleave", () => { ui.style.setProperty("--ry", "0deg"); ui.style.setProperty("--rx", "0deg"); });
  });

  /* ---------------- Ask Sidana: chips fill the box; submit opens a prefilled email ---------------- */
  const mainInput = $("#askInput");
  $$(".chip").forEach((c) => c.addEventListener("click", () => { if (mainInput) { mainInput.value = c.dataset.q || c.textContent.trim(); mainInput.focus(); } }));
  $$(".ask-form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = (f.querySelector("input")?.value || "").trim();
      const subject = encodeURIComponent("Question about raising with Sidana");
      const body = encodeURIComponent(q ? `${q}\n\n` : "");
      window.location.href = `mailto:investors@sidanaventures.com?subject=${subject}&body=${body}`;
    });
  });
})();
