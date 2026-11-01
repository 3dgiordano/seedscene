// The SETUP menu: everything the command line can set, changeable while the
// demo plays. Styled like a C64 program menu — blue panel, reverse-video
// cursor bar — and driven by arrows, Enter and Esc, or by the mouse.

const RESOLUTIONS = [
  [426, 240], [640, 360], [854, 480], [1024, 576], [1280, 720], [1920, 1080],
];
const LENGTHS = [30, 60, 120, 180, 300];

const fmtLength = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Step through a list from the current value, wrapping at both ends. */
function step(list, current, dir, same = (a, b) => a === b) {
  let i = list.findIndex((v) => same(v, current));
  if (i < 0) i = 0;
  return list[(i + dir + list.length) % list.length];
}

/**
 * @param {object} o
 * @param {HTMLElement} o.root
 * @param {string[]} o.styles
 * @param {string[]} o.musics        'auto' first, then the music styles
 * @param {(m:string) => string} o.musicLabel
 * @param {string[]} o.eras          'auto' first, then the eras
 * @param {(e:string) => string} o.eraLabel
 * @param {() => object} o.getState  {seed, style, width, height, duration, overlay, sound}
 * @param {object} o.actions         setSeed, randomSeed, setStyle, setResolution,
 *                                   setMusic, setDuration, setOverlay, setSound, commands
 */
export function createMenu({ root, styles, musics, musicLabel, eras, eraLabel, getState, actions }) {
  let open = false;
  let sel = 0;
  let flash = null;          // { row, text, until }

  const rows = [
    {
      id: 'seed', label: 'SEED',
      value: (s) => s.seed,
      input: true,
    },
    {
      id: 'random', label: 'NEW RANDOM SEED',
      value: () => 'PRESS ENTER',
      activate: () => actions.randomSeed(),
    },
    {
      id: 'style', label: 'SCENE',
      value: (s) => `${styles.indexOf(s.style) + 1}. ${s.style}`,
      change: (s, d) => actions.setStyle(step(styles, s.style, d)),
    },
    {
      id: 'era', label: 'ERA',
      value: (s) => eraLabel(s.era),
      change: (s, d) => actions.setEra(step(eras, s.era, d)),
    },
    {
      id: 'music', label: 'MUSIC',
      value: (s) => musicLabel(s.music),
      change: (s, d) => actions.setMusic(step(musics, s.music, d)),
    },
    {
      id: 'res', label: 'RESOLUTION',
      value: (s) => `${s.width}x${s.height}`,
      change: (s, d) => {
        const [w, h] = step(RESOLUTIONS, [s.width, s.height], d,
          (a, b) => a[0] === b[0] && a[1] === b[1]);
        actions.setResolution(w, h);
      },
    },
    {
      id: 'length', label: 'LENGTH',
      value: (s) => fmtLength(s.duration),
      change: (s, d) => actions.setDuration(step(LENGTHS, s.duration, d)),
    },
    {
      id: 'overlay', label: 'TITLES & SCROLLER',
      value: (s) => (s.overlay ? 'ON' : 'OFF'),
      change: (s) => actions.setOverlay(!s.overlay),
    },
    {
      id: 'sound', label: 'SOUND',
      value: (s) => (s.sound ? 'ON' : 'OFF'),
      change: (s) => actions.setSound(!s.sound),
    },
    {
      id: 'copy-live', label: 'COPY LIVE COMMAND',
      value: () => 'PRESS ENTER',
      activate: () => copy(actions.commands().live, 'copy-live'),
    },
    {
      id: 'copy-render', label: 'COPY MP4 COMMAND',
      value: () => 'PRESS ENTER',
      activate: () => copy(actions.commands().render, 'copy-render'),
    },
  ];

  // ---- DOM ------------------------------------------------------------------
  root.innerHTML = `
    <div class="panel" role="dialog" aria-label="Setup">
      <div class="title">**** SEEDSCENE SETUP ****</div>
      <div class="rows"></div>
      <div class="help">&uarr;&darr; CHOOSE &nbsp; &larr;&rarr; CHANGE &nbsp; ENTER OK &nbsp; M/ESC CLOSE</div>
    </div>`;
  const list = root.querySelector('.rows');

  for (const [i, r] of rows.entries()) {
    const el = document.createElement('div');
    el.className = 'row';
    el.dataset.id = r.id;
    const label = `<span class="label">${r.label}</span>`;
    let value;
    if (r.input) {
      value = '<input class="seed" type="text" maxlength="40" spellcheck="false" autocomplete="off">';
    } else if (r.change) {
      value = '<span class="arrow" data-dir="-1">&lt;</span><span class="value"></span><span class="arrow" data-dir="1">&gt;</span>';
    } else {
      value = '<span class="value"></span>';
    }
    el.innerHTML = `${label}<span class="field">${value}</span>`;
    el.addEventListener('mouseenter', () => { sel = i; render(); });
    el.addEventListener('click', (e) => {
      sel = i;
      const dir = e.target.dataset && e.target.dataset.dir;
      if (r.change) r.change(getState(), dir ? Number(dir) : 1);
      else if (r.activate) r.activate();
      else if (r.input) seedInput.focus();
      render();
    });
    r.el = el;
    list.appendChild(el);
  }

  const seedInput = root.querySelector('input.seed');
  seedInput.addEventListener('keydown', (e) => {
    e.stopPropagation();                    // typing must not trigger shortcuts
    if (e.key === 'Enter') {
      const v = seedInput.value.trim();
      if (v) actions.setSeed(v);
      flashRow('seed', 'LOADED');
      seedInput.blur();
      render();
    } else if (e.key === 'Escape') {
      seedInput.blur();
      seedInput.value = getState().seed;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      seedInput.blur();
      move(e.key === 'ArrowDown' ? 1 : -1);
    }
  });
  // clicking the backdrop (outside the panel) closes the menu
  root.addEventListener('click', (e) => { if (e.target === root) close(); });

  // ---- behaviour ------------------------------------------------------------
  function flashRow(id, text) {
    flash = { id, text, until: performance.now() + 1400 };
    render();
    setTimeout(render, 1450);
  }

  async function copy(text, id) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      // older or locked-down browsers: the textarea route
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    flashRow(id, ok ? 'COPIED!' : 'COPY FAILED');
  }

  function render() {
    const s = getState();
    for (const [i, r] of rows.entries()) {
      r.el.classList.toggle('sel', i === sel);
      if (r.input) {
        if (document.activeElement !== seedInput) seedInput.value = s.seed;
      } else {
        const v = r.el.querySelector('.value');
        const flashing = flash && flash.id === r.id && performance.now() < flash.until;
        v.textContent = flashing ? flash.text : r.value(s);
      }
    }
    if (flash && flash.id === 'seed' && performance.now() < flash.until) {
      rows[0].el.querySelector('.label').textContent = 'SEED ' + flash.text;
    } else {
      rows[0].el.querySelector('.label').textContent = 'SEED';
    }
  }

  function move(d) {
    sel = (sel + d + rows.length) % rows.length;
    render();
    if (rows[sel].input) seedInput.focus();
  }

  function handleKey(e) {
    const r = rows[sel];
    switch (e.key) {
      case 'ArrowDown': move(1); break;
      case 'ArrowUp': move(-1); break;
      case 'ArrowLeft': if (r.change) r.change(getState(), -1); break;
      case 'ArrowRight': if (r.change) r.change(getState(), 1); break;
      case 'Enter':
      case ' ':
        if (r.activate) r.activate();
        else if (r.change) r.change(getState(), 1);
        else if (r.input) seedInput.focus();
        break;
      case 'Escape': case 'm': case 'M': close(); break;
      default: return;              // leave every other key alone
    }
    e.preventDefault();
    render();
  }

  function show() {
    open = true;
    root.classList.add('open');
    render();
    if (rows[sel].input) seedInput.focus();
  }
  function close() {
    open = false;
    seedInput.blur();
    root.classList.remove('open');
  }

  return {
    isOpen: () => open,
    toggle: () => (open ? close() : show()),
    close,
    handleKey,
    refresh: render,
  };
}
