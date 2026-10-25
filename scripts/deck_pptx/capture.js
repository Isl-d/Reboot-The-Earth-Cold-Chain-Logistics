// Renders docs/deck/index.html and splits every slide into a background plus
// one transparent PNG per animated element, with its timing and effect.
// Usage: node capture.js <out-dir>   (needs playwright; see build.py)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(process.argv[2] || "layers");
// DECK=<file> renders another copy of the deck (e.g. a reordered one).
const DECK = path.resolve(process.env.DECK || path.join(__dirname, "../../docs/deck/index.html"));
const SCALE = 1.5;
const PAD = 24;
const ANIMATED = "[data-a],.draw,.grow,.rise,.wipe,.shrink";
// Entrance keyframes that some elements start from bespoke CSS rules, not data-a.
const ENTRANCE = ["up", "fade", "left", "right", "zoom"];

const FREEZE = `
  *,*::before,*::after{transition:none!important}
  .progress,.hint,.notes,.overview{display:none!important}
  .slide{transform:none!important}
  html:has(body.cap-layer),body.cap-layer{background:transparent!important}
  body.cap-layer .stage{background:transparent!important}
  body.cap-layer .stage::before{display:none!important}
  body.cap-layer .stage *{visibility:hidden!important}
  body.cap-layer .stage .cap-target,
  body.cap-layer .stage .cap-target *:not(.cap-skip){visibility:visible!important}
  body.cap-layer .stage .cap-target .cap-skip,
  body.cap-layer .stage .cap-target .cap-skip *{visibility:hidden!important}
  body.cap-bg .stage .cap-skip,body.cap-bg .stage .cap-skip *{visibility:hidden!important}
`;

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: SCALE,
  });
  await page.goto("file://" + DECK, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: FREEZE });
  await page.evaluate(() => document.fonts.ready);
  const count = await page.evaluate(() => document.querySelectorAll(".slide").length);
  const manifest = [];

  for (let n = 1; n <= count; n++) {
    await page.evaluate((n) => { location.hash = "#" + n; }, n);
    await page.waitForTimeout(250);
    // Jump every animation to its end state; looping ones go back to rest.
    await page.evaluate(() => {
      document.getAnimations().forEach((a) => {
        try {
          if (a.effect.getComputedTiming().iterations === Infinity) a.cancel();
          else a.finish();
        } catch {}
      });
    });
    // Count-up numbers: jump to their final value and stop the tickers.
    await page.evaluate(() => {
      document.querySelectorAll(".slide.active [data-count]").forEach((el) => {
        el.textContent = (+el.dataset.count).toFixed(+(el.dataset.decimals || 0));
      });
    });
    await page.waitForTimeout(1700);
    await page.evaluate(() => {
      document.querySelectorAll(".slide.active [data-count]").forEach((el) => {
        el.textContent = (+el.dataset.count).toFixed(+(el.dataset.decimals || 0));
      });
    });
    const dir = path.join(OUT, String(n).padStart(2, "0"));
    fs.mkdirSync(dir);

    const info = await page.evaluate(([ANIMATED, ENTRANCE]) => {
      const s = document.querySelector(".slide.active");
      const els = [...s.querySelectorAll(ANIMATED)];
      // Elements whose entrance comes from a stylesheet rule rather than data-a.
      const extra = new Map();
      s.querySelectorAll("*").forEach((e) => {
        if (e.matches(ANIMATED)) return;
        const cs = getComputedStyle(e);
        const names = cs.animationName.split(",").map((x) => x.trim());
        const delays = cs.animationDelay.split(",").map((x) => parseFloat(x) * 1000);
        const i = names.findIndex((n) => ENTRANCE.includes(n));
        if (i >= 0) { els.push(e); extra.set(e, { kind: names[i], delay: delays[i % delays.length] }); }
      });
      els.forEach((e, i) => { e.dataset.capId = i; e.classList.add("cap-skip"); });
      return {
        title: s.dataset.title,
        label: s.dataset.label,
        notes: s.dataset.notes || "",
        layers: els.map((e, i) => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          const inline = e.style.getPropertyValue("--d");
          const x = extra.get(e);
          const d = x ? x.delay : +(inline || cs.getPropertyValue("--d") || 0);
          const dur = e.style.getPropertyValue("--dur");
          const kind = x ? x.kind : e.classList.contains("draw") ? "draw"
            : e.classList.contains("wipe") ? "wipe"
            : e.classList.contains("grow") || e.classList.contains("shrink") ? "grow"
            : e.classList.contains("rise") ? "rise"
            : e.dataset.a || "up";
          return { id: i, x: r.left, y: r.top, w: r.width, h: r.height, delay: d,
                   dur: dur ? parseFloat(dur) * 1000 : 0, kind,
                   alt: (e.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200) };
        }),
      };
    }, [ANIMATED, ENTRANCE]);

    // Background: everything that is not animated, on the real stage.
    await page.evaluate(() => document.body.classList.add("cap-bg"));
    await page.screenshot({ path: path.join(dir, "bg.png") });
    await page.evaluate(() => document.body.classList.remove("cap-bg"));

    // One transparent PNG per animated element.
    await page.evaluate(() => document.body.classList.add("cap-layer"));
    const kept = [];
    for (const L of info.layers) {
      const x = Math.max(0, Math.floor(L.x - PAD)), y = Math.max(0, Math.floor(L.y - PAD));
      const w = Math.min(1920, Math.ceil(L.x + L.w + PAD)) - x;
      const h = Math.min(1080, Math.ceil(L.y + L.h + PAD)) - y;
      if (L.w < 1 && L.h < 1 || w < 2 || h < 2) continue;
      await page.evaluate((id) => {
        const e = document.querySelector(`.slide.active [data-cap-id="${id}"]`);
        e.classList.remove("cap-skip"); e.classList.add("cap-target");
      }, L.id);
      const file = `L${String(L.id).padStart(3, "0")}.png`;
      await page.screenshot({ path: path.join(dir, file), omitBackground: true, clip: { x, y, width: w, height: h } });
      await page.evaluate((id) => {
        const e = document.querySelector(`.slide.active [data-cap-id="${id}"]`);
        e.classList.add("cap-skip"); e.classList.remove("cap-target");
      }, L.id);
      kept.push({ ...L, file, x, y, w, h });
    }
    await page.evaluate(() => document.body.classList.remove("cap-layer"));
    info.layers = kept;
    manifest.push(info);
    console.log(`slide ${n}/${count}: ${kept.length} layers`);
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
  await browser.close();
})();
