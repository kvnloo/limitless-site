// Limitless launch page: scroll progress, active nav, the loop stepper, the difficulty rule simulator,
// card spotlight, copy button, reveal on scroll. No dependencies, no network calls, no tracking.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // scroll progress + active nav
  const bar = $('.progress i');
  const links = $$('.top nav a[href^="#"]');
  const secs = links.map((a) => $(a.getAttribute('href')));
  const onScroll = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // the loop: five nodes on the ring, a comet that travels to the chosen step
  const svg = $('#loopsvg'); const lit = $('#looplit'); const comet = $('#comet');
  const R = 200, C = 2 * Math.PI * R;
  const pos = (k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return [260 + R * Math.cos(a), 260 + R * Math.sin(a)]; };
  const NS = 'http://www.w3.org/2000/svg';
  const nodes = [0, 1, 2, 3, 4].map((k) => { const c = document.createElementNS(NS, 'circle'); const [x, y] = pos(k); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 13); c.setAttribute('class', 'node'); svg.appendChild(c); return c; });
  svg.appendChild(comet);
  let at = 0, anim = null;
  const place = (f) => { const a = -Math.PI / 2 + f * 2 * Math.PI / 5; comet.setAttribute('cx', 260 + R * Math.cos(a)); comet.setAttribute('cy', 260 + R * Math.sin(a)); };
  const go = (k) => {
    $$('#steps li').forEach((li, i) => li.classList.toggle('on', i === k));
    nodes.forEach((n, i) => { n.classList.toggle('on', i <= k); n.setAttribute('r', i === k ? 17 : 13); });
    lit.style.strokeDasharray = `${(C * k) / 5} ${C}`;
    const from = at, to = k; at = k;
    if (reduce) { place(to); return; }
    cancelAnimationFrame(anim); const t0 = performance.now(), d = 520;
    const step = (now) => { const x = Math.min(1, (now - t0) / d); const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; place(from + (to - from) * e); if (x < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  };
  $$('#steps li').forEach((li, i) => li.querySelector('button').addEventListener('click', () => go(i)));
  $('#steps').addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const k = (at + (e.key === 'ArrowDown' ? 1 : 4)) % 5; go(k); $$('#steps button')[k].focus(); } });
  go(0);

  // difficulty rule simulator (roadmap rule, illustrative): two misses in a row -> smaller, three done -> bigger
  const STEPS = ['one minute', 'two minutes', 'five minutes', 'ten minutes', 'fifteen minutes', 'twenty minutes'];
  let lvl = 1, streak = 0, miss = 0, hist = [];
  const days = $('#days'), bars = $('#bars'), read = $('#simread');
  const MAX = 22;
  const draw = () => {
    days.innerHTML = ''; bars.innerHTML = '';
    hist.slice(-MAX).forEach((d) => {
      const i = document.createElement('i'); i.className = d.a; days.appendChild(i);
      const b = document.createElement('i'); b.style.height = `${(d.l + 1) * 22}px`; if (d.up) b.className = 'up'; bars.appendChild(b);
    });
  };
  $$('#sim [data-a]').forEach((btn) => btn.addEventListener('click', () => {
    const a = btn.dataset.a; let why = '';
    if (a === 'reset') { lvl = 1; streak = 0; miss = 0; hist = []; draw(); read.textContent = 'Next step: two minutes. Tap a day.'; return; }
    const prev = lvl;
    if (a === 'done') { streak++; miss = 0; if (streak === 3) { lvl = Math.min(STEPS.length - 1, lvl + 1); streak = 0; why = 'three in a row, so the step grows'; } }
    if (a === 'no') { miss++; streak = 0; if (miss >= 2) { lvl = Math.max(0, lvl - 1); miss = 0; why = 'two misses in a row, so the step gets smaller'; } }
    if (a === 'skip') why = 'skipped: unlogged, not failed';
    hist.push({ a, l: lvl, up: lvl > prev }); draw();
    read.textContent = `Next step: ${STEPS[lvl]}.${why ? ' ' + why[0].toUpperCase() + why.slice(1) + '.' : ''}`;
  }));

  // card spotlight follows the pointer
  $$('.card').forEach((c) => c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`); }));

  // copy the install command
  const toast = $('#toast');
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast.textContent = 'Copied the clone command'; }
    catch { toast.textContent = 'Select the command to copy it'; }
    toast.classList.add('on'); setTimeout(() => toast.classList.remove('on'), 1600);
  }));

  // reveal sections as they enter
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('.sec, .loopwrap, .layers, .sim, .card, .moment > *, .node, .tiers li, .road li, .code');
    els.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 55}ms`; io.observe(el); });
  }
})();
