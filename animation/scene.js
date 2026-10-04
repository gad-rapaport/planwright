/*
 * Planwright product film (21.5 s, 1920x1080). Paper cut-out style: every element is a flat sheet with a hard
 * shadow, scenarios are sheets laid over a base plan, and the balance lines are paper strips.
 * Story: a workshop owner weighs two decisions -> branches the plan in Planwright (real screen) -> the branches
 * form a tree, each holding only its changes -> the balances are compared (real numbers exported from the app)
 * -> offline and the printed report (real print view) -> the owner decides with the report in hand.
 */
const { ease, prog, tw, life, wave, h, place, createStage, attachPlayer } = Motion;

const C = {
  desk: '#efe6d3',
  desk2: '#e4d7bd',
  desk3: '#d8c8a8',
  paper: '#fffdf8',
  paper2: '#f6f1e7',
  paper3: '#e9dfc9',
  ink: '#24211c',
  ink2: '#57514a',
  line: '#d8cfbf',
  accent: '#b4532a',
  amber: '#8a5a00',
  amberSoft: '#fdf3dc',
  goodSoft: '#e6f2ea',
  good: '#1d6b3a',
  bad: '#a3261e',
  skin: '#d39a72',
  hair: '#3a2a20',
  shirt: '#e9d8b4',
  trousers: '#3b3a40',
  wood: '#a0764f',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
};
const DUR = 21.5;
const svg = document.getElementById('stage');

fetch('data/sample-balances.json')
  .then((r) => r.json())
  .then(build);

function build(data) {
  const stage = createStage({ duration: DUR, root: svg });

  svg.appendChild(
    h('defs', {}, [
      h('filter', { id: 'cut', x: '-10%', y: '-10%', width: '130%', height: '130%' }, [
        h('feDropShadow', { dx: 5, dy: 7, stdDeviation: 0, 'flood-color': C.ink, 'flood-opacity': 0.16 }),
      ]),
      h('filter', { id: 'grain', x: 0, y: 0, width: '100%', height: '100%' }, [
        h('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 2, seed: 7 }),
        h('feColorMatrix', { values: '0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0 0.2  0 0 0 0.09 0' }),
      ]),
      h('clipPath', { id: 'screen' }, [h('rect', { x: 0, y: 0, width: 1056, height: 660, rx: 8 })]),
      h('clipPath', { id: 'report' }, [h('rect', { x: 0, y: 0, width: 760, height: 560 })]),
    ]),
  );

  // ---------- desk and layered paper hills ----------
  svg.appendChild(h('rect', { width: 1920, height: 1080, fill: C.desk }));
  const hill = (y, amp, period, phase) => {
    let d = `M0 1080 L0 ${y}`;
    for (let x = 0; x <= 1920; x += 40)
      d += ` L${x} ${(y + Math.sin((x / period) * Math.PI * 2 + phase) * amp).toFixed(1)}`;
    return d + ' L1920 1080 Z';
  };
  const hills = h('g');
  svg.appendChild(hills);
  hills.appendChild(h('path', { d: hill(900, 18, 700, 0.4), fill: C.desk2, filter: 'url(#cut)' }));
  hills.appendChild(h('path', { d: hill(970, 14, 520, 2.1), fill: C.desk3, filter: 'url(#cut)' }));

  // ---------- the owner, built from paper pieces ----------
  function person() {
    const g = h('g', { filter: 'url(#cut)' });
    const armL = h('g');
    const armR = h('g');
    const arm = () =>
      h('g', {}, [
        h('rect', { x: -15, y: 0, width: 30, height: 150, rx: 15, fill: C.shirt }),
        h('circle', { cx: 0, cy: 156, r: 17, fill: C.skin }),
      ]);
    armL.appendChild(arm());
    armR.appendChild(arm());
    g.appendChild(h('rect', { x: -40, y: -215, width: 32, height: 215, rx: 6, fill: C.trousers }));
    g.appendChild(h('rect', { x: 8, y: -215, width: 32, height: 215, rx: 6, fill: C.trousers }));
    g.appendChild(h('ellipse', { cx: -26, cy: -4, rx: 30, ry: 12, fill: C.ink }));
    g.appendChild(h('ellipse', { cx: 26, cy: -4, rx: 30, ry: 12, fill: C.ink }));
    g.appendChild(armL);
    g.appendChild(h('rect', { x: -72, y: -430, width: 144, height: 240, rx: 46, fill: C.shirt }));
    g.appendChild(h('path', { d: 'M-52 -385 L52 -385 L66 -192 L-66 -192 Z', fill: C.accent }));
    g.appendChild(h('rect', { x: -30, y: -330, width: 60, height: 40, rx: 6, fill: '#9a4422' }));
    g.appendChild(h('rect', { x: -16, y: -462, width: 32, height: 40, fill: C.skin }));
    const head = h('g');
    head.appendChild(h('circle', { cx: 0, cy: -510, r: 58, fill: C.skin }));
    head.appendChild(
      h('path', { d: 'M-60 -512 C-64 -580 60 -590 60 -520 C40 -545 -20 -548 -60 -512 Z', fill: C.hair }),
    );
    head.appendChild(h('circle', { cx: -20, cy: -505, r: 5, fill: C.ink }));
    head.appendChild(h('circle', { cx: 20, cy: -505, r: 5, fill: C.ink }));
    const mouth = h('path', { fill: 'none', stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' });
    head.appendChild(mouth);
    g.appendChild(head);
    g.appendChild(armR);
    return {
      g,
      pose({ left = 10, right = -10, smile = 0, tilt = 0 }) {
        armL.setAttribute('transform', `translate(-62 -400) rotate(${left.toFixed(2)})`);
        armR.setAttribute('transform', `translate(62 -400) rotate(${right.toFixed(2)})`);
        mouth.setAttribute('d', `M-16 -478 Q0 ${(-478 + smile * 12).toFixed(1)} 16 -478`);
        head.setAttribute('transform', `rotate(${tilt.toFixed(2)} 0 -470)`);
      },
    };
  }

  const shop = h('g', { transform: 'translate(200 0)' });
  svg.appendChild(shop);
  const owner = person();
  shop.appendChild(owner.g);
  const bench = h('g', { filter: 'url(#cut)' }, [
    h('rect', { x: 560, y: 760, width: 26, height: 190, fill: '#7d5a3a' }),
    h('rect', { x: 1040, y: 760, width: 26, height: 190, fill: '#7d5a3a' }),
    h('rect', { x: 530, y: 730, width: 570, height: 40, rx: 6, fill: C.wood }),
  ]);
  shop.appendChild(bench);
  const wheel = h('g', { filter: 'url(#cut)' });
  wheel.appendChild(h('circle', { r: 128, fill: 'none', stroke: C.ink, 'stroke-width': 22 }));
  wheel.appendChild(h('circle', { r: 108, fill: 'none', stroke: '#b9b2a6', 'stroke-width': 6 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    wheel.appendChild(
      h('line', {
        x1: 0,
        y1: 0,
        x2: Math.cos(a) * 106,
        y2: Math.sin(a) * 106,
        stroke: '#8f887c',
        'stroke-width': 3,
      }),
    );
  }
  wheel.appendChild(h('circle', { r: 16, fill: C.ink2 }));
  shop.appendChild(wheel);

  const thought = (text, color) => {
    const g = h('g', { filter: 'url(#cut)' });
    const w = text.length * 19 + 70;
    g.appendChild(h('rect', { x: -w / 2, y: -46, width: w, height: 92, rx: 10, fill: C.paper }));
    g.appendChild(h('rect', { x: -w / 2, y: -46, width: 12, height: 92, rx: 4, fill: color }));
    const t = h('text', {
      x: 6,
      y: 13,
      'text-anchor': 'middle',
      'font-size': 36,
      class: 'head',
      fill: C.ink,
      text,
    });
    g.appendChild(t);
    const check = h('g', { opacity: 0 }, [
      h('circle', { cx: w / 2, cy: -46, r: 26, fill: C.good }),
      h('path', {
        d: `M${w / 2 - 11} -46 l8 9 l15 -17`,
        fill: 'none',
        stroke: C.paper,
        'stroke-width': 6,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ]);
    g.appendChild(check);
    shop.appendChild(g);
    return { g, t, check };
  };
  const qA = thought('Hire an apprentice?', C.series[1]);
  const qB = thought('Move to a bigger space?', C.series[3]);
  const heldReport = h('g', { filter: 'url(#cut)' }, [
    h('rect', { x: -110, y: -150, width: 220, height: 290, rx: 4, fill: C.paper }),
    h('text', { x: -90, y: -112, 'font-size': 20, class: 'head', fill: C.ink, text: 'Scenario report' }),
    h('line', { x1: -90, x2: 90, y1: 10, y2: 10, stroke: C.ink, 'stroke-width': 2 }),
    h('path', { d: 'M-90 -20 C-40 -24 10 -30 90 -60', fill: 'none', stroke: C.series[0], 'stroke-width': 5 }),
    h('path', { d: 'M-90 -20 C-40 -5 20 0 90 -30', fill: 'none', stroke: C.series[1], 'stroke-width': 5 }),
    h('path', { d: 'M-90 -40 C-60 20 20 30 90 20', fill: 'none', stroke: C.series[3], 'stroke-width': 5 }),
    ...[50, 74, 98, 122].map((y) => h('rect', { x: -90, y, width: 180, height: 10, rx: 4, fill: C.line })),
  ]);
  shop.appendChild(heldReport);

  // ---------- laptop with the real branch editor ----------
  const laptop = h('g', { filter: 'url(#cut)' });
  svg.appendChild(laptop);
  laptop.appendChild(h('rect', { x: -28, y: -28, width: 1112, height: 716, rx: 26, fill: '#2b2823' }));
  laptop.appendChild(
    h('image', {
      href: '../docs/screenshots/plan-branch.png',
      x: 0,
      y: 0,
      width: 1056,
      height: 660,
      'clip-path': 'url(#screen)',
      preserveAspectRatio: 'xMidYMin slice',
    }),
  );
  laptop.appendChild(h('path', { d: 'M-130 688 H1186 L1140 736 H-84 Z', fill: C.paper2 }));
  const k = 1056 / 1440;
  const btn = { x: 1123 * k, y: 133 * k };
  const ring = h('rect', {
    x: 1043 * k - 8,
    y: 113 * k - 8,
    width: 160 * k + 16,
    height: 40 * k + 16,
    rx: 12,
    fill: 'none',
    stroke: C.accent,
    'stroke-width': 6,
  });
  laptop.appendChild(ring);
  const cursor = h('path', {
    d: 'M0 0 L0 40 L11 31 L19 50 L26 47 L18 29 L32 29 Z',
    fill: C.paper,
    stroke: C.ink,
    'stroke-width': 3,
  });
  laptop.appendChild(cursor);

  // ---------- scenario tree: sheets that store only their changes ----------
  const tree = h('g');
  svg.appendChild(tree);
  const connectors = h('g', {
    fill: 'none',
    stroke: C.ink2,
    'stroke-width': 5,
    'stroke-linecap': 'round',
    'stroke-dasharray': '2 12',
  });
  tree.appendChild(connectors);
  const links = ['M280 372 L280 448', 'M432 300 C560 300 620 330 620 448', 'M620 602 L620 668'].map((d) => {
    const p = h('path', { d, pathLength: 1 });
    connectors.appendChild(p);
    return p;
  });
  const sheet = (x, y, name, color, rows, note) => {
    const g = h('g', { filter: 'url(#cut)' });
    g.appendChild(h('rect', { x: 0, y: 0, width: 300, height: 154, rx: 6, fill: C.paper }));
    g.appendChild(h('rect', { x: 0, y: 0, width: 300, height: 12, rx: 4, fill: color }));
    g.appendChild(h('text', { x: 18, y: 50, 'font-size': 22, class: 'head', fill: C.ink, text: name }));
    if (note) g.appendChild(h('text', { x: 18, y: 76, 'font-size': 17, fill: C.ink2, text: note }));
    rows.forEach((w, i) =>
      g.appendChild(h('rect', { x: 18, y: 96 + i * 18, width: w, height: 9, rx: 4, fill: C.line })),
    );
    tree.appendChild(g);
    return { g, x, y };
  };
  const sBase = sheet(130, 220, 'Baseline', C.series[0], [240, 200, 220], '10 lines');
  const sSlow = sheet(130, 450, 'Slow first year', C.series[2], [180, 120], '3 changes');
  const sApp = sheet(470, 450, 'Hire an apprentice', C.series[1], [], '2 changes');
  const sBig = sheet(470, 670, 'Apprentice + bigger space', C.series[3], [], '4 changes');
  const chip = (text, fill, stroke, color) => {
    const g = h('g', { filter: 'url(#cut)' });
    const w = text.length * 10 + 26;
    g.appendChild(
      h('rect', { x: 0, y: -18, width: w, height: 36, rx: 8, fill, stroke, 'stroke-width': 2.5 }),
    );
    g.appendChild(h('text', { x: 13, y: 6, 'font-size': 18, 'font-weight': 600, fill: color, text }));
    tree.appendChild(g);
    return g;
  };
  const chipRent = chip('Rent 7,800 → 11,500', C.amberSoft, C.amber, C.amber);
  const chipWage = chip('+ Apprentice wage 7,500', C.goodSoft, C.good, C.good);

  // ---------- balance comparison from the app's CSV export ----------
  const chart = h('g');
  svg.appendChild(chart);
  const X0 = 920;
  const X1 = 1610;
  const Ytop = 260;
  const Ybot = 800;
  const vMax = 100000;
  const vMin = -150000;
  const months = data.months.length;
  const xAt = (i) => X0 + (i / (months - 1)) * (X1 - X0);
  const yAt = (v) => Ytop + ((vMax - v) / (vMax - vMin)) * (Ybot - Ytop);
  chart.appendChild(
    h('rect', {
      x: X0 - 110,
      y: Ytop - 70,
      width: X1 - X0 + 400,
      height: Ybot - Ytop + 140,
      rx: 10,
      fill: C.paper,
      filter: 'url(#cut)',
    }),
  );
  chart.appendChild(
    h('text', {
      x: X0 - 80,
      y: Ytop - 28,
      'font-size': 26,
      class: 'head',
      fill: C.ink,
      text: 'Closing balance, Jan 2027 to Dec 2028',
    }),
  );
  for (let v = vMin; v <= vMax; v += 50000) {
    chart.appendChild(
      h('line', {
        x1: X0,
        x2: X1,
        y1: yAt(v),
        y2: yAt(v),
        stroke: v === 0 ? C.ink : C.line,
        'stroke-width': v === 0 ? 3 : 1.5,
        'stroke-dasharray': v === 0 ? '10 6' : '',
      }),
    );
    chart.appendChild(
      h('text', {
        x: X0 - 14,
        y: yAt(v) + 7,
        'text-anchor': 'end',
        'font-size': 19,
        fill: C.ink2,
        text: `${v < 0 ? '-' : ''}₪${Math.abs(v / 1000)}k`,
      }),
    );
  }
  ['Jan 27', 'Jul', 'Jan 28', 'Jul', 'Dec'].forEach((label, i) => {
    const idx = [0, 6, 12, 18, 23][i];
    chart.appendChild(
      h('text', {
        x: xAt(idx),
        y: Ybot + 34,
        'text-anchor': 'middle',
        'font-size': 19,
        fill: C.ink2,
        text: label,
      }),
    );
  });
  const strips = data.series.map((s, i) => {
    const d = s.balance.map((v, m) => `${m ? 'L' : 'M'}${xAt(m).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
    const p = h('path', {
      d,
      fill: 'none',
      stroke: C.series[i],
      'stroke-width': 9,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
      filter: 'url(#cut)',
    });
    chart.appendChild(p);
    return p;
  });
  const ends = data.series.map((s) => yAt(s.balance.at(-1)));
  // Spread end labels so they never overlap.
  const order = ends.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  for (let j = 1; j < order.length; j++) order[j].y = Math.max(order[j].y, order[j - 1].y + 34);
  const labels = data.series.map((s, i) => {
    const y = order.find((o) => o.i === i).y;
    const g = h('g', {}, [
      h('rect', { x: X1 + 20, y: y - 6, width: 22, height: 12, rx: 3, fill: C.series[i] }),
      h('text', {
        x: X1 + 52,
        y: y + 7,
        'font-size': 21,
        'font-weight': 600,
        fill: C.ink,
        text: s.name.replace('Apprentice + bigger space', 'Bigger space'),
      }),
    ]);
    chart.appendChild(g);
    return g;
  });
  const runOut = data.series[3].balance.findIndex((v) => v < 0);
  const flag = h('g', { filter: 'url(#cut)' }, [
    h('line', { x1: 0, y1: 0, x2: 0, y2: 96, stroke: C.ink, 'stroke-width': 4 }),
    h('circle', { cx: 0, cy: 0, r: 8, fill: C.bad }),
    h('path', { d: 'M0 48 H236 L218 72 L236 96 H0 Z', fill: C.bad }),
    h('text', {
      x: 14,
      y: 80,
      'font-size': 21,
      'font-weight': 600,
      fill: C.paper,
      text: `Runs out in ${data.months[runOut].replace('20', '')}`,
    }),
  ]);
  chart.appendChild(flag);
  const endValue = h('text', {
    'font-size': 22,
    'font-weight': 600,
    fill: C.series[0],
    text: `₪${data.series[0].balance.at(-1).toLocaleString('en-GB')}`,
  });
  chart.appendChild(endValue);

  // ---------- offline and the printed report ----------
  const report = h('g', { filter: 'url(#cut)' });
  svg.appendChild(report);
  report.appendChild(h('rect', { x: -20, y: -20, width: 800, height: 600, rx: 4, fill: C.paper }));
  report.appendChild(
    h('image', {
      href: '../docs/screenshots/print.png',
      x: -170,
      y: 0,
      width: 1100,
      height: 1829,
      'clip-path': 'url(#report)',
      preserveAspectRatio: 'xMinYMin meet',
    }),
  );
  const pill = (text, icon) => {
    const g = h('g', { filter: 'url(#cut)' });
    const w = text.length * 13 + 86;
    g.appendChild(
      h('rect', {
        x: 0,
        y: -32,
        width: w,
        height: 64,
        rx: 32,
        fill: C.paper,
        stroke: C.ink,
        'stroke-width': 3,
      }),
    );
    g.appendChild(icon);
    g.appendChild(h('text', { x: 66, y: 9, 'font-size': 24, 'font-weight': 600, fill: C.ink, text }));
    svg.appendChild(g);
    return g;
  };
  const wifi = h(
    'g',
    {
      transform: 'translate(34 6)',
      fill: 'none',
      stroke: C.ink,
      'stroke-width': 4,
      'stroke-linecap': 'round',
    },
    [
      h('path', { d: 'M-16 -8 A24 24 0 0 1 16 -8' }),
      h('path', { d: 'M-9 -1 A13 13 0 0 1 9 -1' }),
      h('circle', { cx: 0, cy: 7, r: 2.5, fill: C.ink }),
      h('line', { x1: -16, y1: -18, x2: 16, y2: 14, stroke: C.bad }),
    ],
  );
  const disk = h(
    'g',
    {
      transform: 'translate(34 0)',
      fill: 'none',
      stroke: C.ink,
      'stroke-width': 3.5,
      'stroke-linejoin': 'round',
    },
    [h('path', { d: 'M-15 -15 H9 L15 -9 V15 H-15 Z' }), h('rect', { x: -8, y: -15, width: 14, height: 9 })],
  );
  const pillOffline = pill('Works offline', wifi);
  const pillSaved = pill('Saved in this browser', disk);
  const pillUndo = pill(
    'Undo every change',
    h('path', {
      transform: 'translate(34 2)',
      d: 'M-6 -14 L-15 -5 L-6 4 M-15 -5 H5 a9 9 0 0 1 0 18 H-4',
      fill: 'none',
      stroke: C.ink,
      'stroke-width': 4,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );

  // ---------- end card ----------
  const end = h('g');
  svg.appendChild(end);
  end.appendChild(h('rect', { width: 1920, height: 1080, fill: C.desk }));
  const mark = h('g', { filter: 'url(#cut)' }, [
    h('rect', {
      x: -96,
      y: -60,
      width: 132,
      height: 132,
      rx: 18,
      fill: C.paper3,
      stroke: C.ink,
      'stroke-width': 6,
    }),
    h('rect', {
      x: -52,
      y: -100,
      width: 132,
      height: 132,
      rx: 18,
      fill: C.accent,
      stroke: C.ink,
      'stroke-width': 6,
    }),
    h('path', {
      d: 'M-24 -16 L6 -46 L36 -30 L60 -68',
      fill: 'none',
      stroke: C.paper,
      'stroke-width': 11,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  ]);
  end.appendChild(mark);
  const title = h('text', {
    x: 960,
    y: 640,
    'text-anchor': 'middle',
    'font-size': 124,
    class: 'head',
    fill: C.ink,
    text: 'Planwright',
  });
  const tag = h('text', {
    x: 960,
    y: 710,
    'text-anchor': 'middle',
    'font-size': 40,
    fill: C.ink2,
    text: 'Branch a plan. Compare the outcomes. Decide.',
  });
  const repo = h('text', {
    x: 960,
    y: 800,
    'text-anchor': 'middle',
    'font-size': 30,
    'font-weight': 600,
    fill: C.accent,
    text: 'github.com/gad-rapaport/planwright',
  });
  [title, tag, repo].forEach((e) => end.appendChild(e));

  // Paper grain over everything.
  svg.appendChild(
    h('rect', { width: 1920, height: 1080, filter: 'url(#grain)', opacity: 0.55, 'pointer-events': 'none' }),
  );

  // ---------- captions ----------
  const capBack = h('rect', { x: 96, y: 46, height: 92, rx: 8, fill: C.paper, filter: 'url(#cut)' });
  const capText = h('text', { x: 124, y: 108, 'font-size': 46, class: 'head', fill: C.ink });
  svg.appendChild(capBack);
  svg.appendChild(capText);
  const CAPS = [
    [0.5, 4.0, 'Two big decisions. What can the workshop afford?'],
    [4.4, 7.7, 'Branch the plan instead of copying it.'],
    [8.0, 11.0, 'Each branch keeps only what it changes.'],
    [11.2, 14.4, 'Compare the outcomes, month by month.'],
    [14.8, 17.5, 'Works offline. Prints a clean report.'],
    [17.9, 19.4, 'Decide with the numbers in front of you.'],
  ];
  const capWidth = (text) => text.length * 22.5 + 60;

  stage.add((t) => {
    // Workshop: 0-4.3 and again 17.6-19.7.
    const shopOn = Math.max(life(t, 0, 4.3, 0.3, 0.4), life(t, 17.6, 19.8, 0.4, 0.3));
    shop.setAttribute('opacity', shopOn.toFixed(3));
    hills.setAttribute('opacity', (0.35 + 0.65 * shopOn).toFixed(3));
    const late = t > 10;
    place(owner.g, { x: 330, y: 960 + (1 - ease.outBack(prog(t, 0.1, 0.7))) * 80 });
    if (!late) {
      owner.pose({
        left: 12 + wave(t, 3, 3),
        right: -60 + wave(t, 2.4, 4),
        smile: -0.2,
        tilt: wave(t, 3.2, 3),
      });
    } else {
      const lift = ease.outBack(prog(t, 17.8, 0.6));
      owner.pose({ left: 12 - 60 * lift, right: -12 + 50 * lift, smile: lift, tilt: 4 * lift });
    }
    place(wheel, { x: 820, y: 600, r: t * 40 });
    place(heldReport, {
      x: 330,
      y: 610,
      o: late ? prog(t, 17.9, 0.3) : 0,
      r: -4,
      s: tw(t, 17.9, 0.5, 0.6, 1, ease.outBack),
    });
    place(qA.g, {
      x: 980,
      y: 300 + wave(t, 2.8, 6),
      s: tw(t, 0.9, 0.5, 0.4, 1, ease.outBack),
      r: -2,
      o: prog(t, 0.9, 0.2),
    });
    place(qB.g, {
      x: 1360,
      y: 450 + wave(t, 3.1, 6, 1),
      s: tw(t, 1.3, 0.5, 0.4, 1, ease.outBack),
      r: 2,
      o: prog(t, 1.3, 0.2),
    });
    const decided = t > 18.2;
    qA.t.textContent = decided ? 'Hire an apprentice' : 'Hire an apprentice?';
    qB.t.textContent = decided ? 'Bigger space: not yet' : 'Move to a bigger space?';
    qA.check.setAttribute('opacity', late ? prog(t, 18.3, 0.2).toFixed(3) : 0);
    if (late) place(qA.check, { x: 0, y: 0, s: 1 });

    // Laptop with the branch editor: 4.2-8.0.
    const lapOn = life(t, 4.2, 8.1, 0.5, 0.4);
    place(laptop, {
      x: 432,
      y: 250 + (1 - ease.outCubic(prog(t, 4.2, 0.6))) * 220 + ease.inCubic(prog(t, 7.7, 0.4)) * 160,
      o: lapOn,
    });
    const move = ease.inOutCubic(prog(t, 5.0, 1.2));
    place(cursor, {
      x: 300 + (btn.x - 300) * move,
      y: 520 + (btn.y + 4 - 520) * move,
      s: 1 - 0.2 * Math.sin(prog(t, 6.4, 0.25) * Math.PI),
    });
    ring.setAttribute('opacity', life(t, 6.35, 7.6, 0.1, 0.3).toFixed(3));

    // Tree of scenario sheets: 7.9-14.6, sheets drop in, then the changes appear.
    const treeOn = life(t, 7.9, 14.7, 0.2, 0.4);
    const treeShift = ease.inOutCubic(prog(t, 14.3, 0.5)) * -120;
    tree.setAttribute('opacity', treeOn.toFixed(3));
    [sBase, sApp, sSlow, sBig].forEach((s, i) => {
      const start = 8.0 + i * 0.35;
      const p = prog(t, start, 0.55);
      // Branches peel off the baseline sheet: start stacked on it, slide to their place.
      const fromX = i === 0 ? s.x : sBase.x;
      const fromY = i === 0 ? s.y - 140 : sBase.y;
      place(s.g, {
        x: fromX + (s.x - fromX) * ease.outBack(p) + treeShift,
        y: fromY + (s.y - fromY) * ease.outBack(p),
        r: (1 - ease.outCubic(p)) * (i % 2 ? 8 : -8),
        o: prog(t, start, 0.15),
      });
    });
    links.forEach((l, i) => {
      l.setAttribute('stroke-dashoffset', 0);
      l.setAttribute('opacity', prog(t, 8.6 + i * 0.35, 0.3).toFixed(3));
      l.setAttribute('transform', `translate(${treeShift.toFixed(1)} 0)`);
    });
    place(chipWage, {
      x: 488 + treeShift,
      y: 572,
      s: tw(t, 9.6, 0.4, 0.5, 1, ease.outBack),
      o: prog(t, 9.6, 0.15),
    });
    place(chipRent, {
      x: 488 + treeShift,
      y: 792,
      s: tw(t, 10.0, 0.4, 0.5, 1, ease.outBack),
      o: prog(t, 10.0, 0.15),
    });

    // Chart: 10.6-14.6; strips draw from left to right.
    const chartOn = life(t, 10.6, 14.7, 0.4, 0.4);
    place(chart, { x: treeShift, y: (1 - ease.outCubic(prog(t, 10.6, 0.6))) * 60, o: chartOn });
    strips.forEach((p, i) => {
      const d = ease.inOutCubic(prog(t, 11.2 + i * 0.25, 1.5));
      p.setAttribute('stroke-dasharray', `${d.toFixed(4)} 1`);
    });
    labels.forEach((g, i) => place(g, { x: 0, y: 0, o: prog(t, 12.6 + i * 0.12, 0.3) }));
    place(flag, {
      x: xAt(runOut),
      y: yAt(data.series[3].balance[runOut]),
      s: tw(t, 13.1, 0.45, 0.2, 1, ease.outBack),
      o: prog(t, 13.1, 0.1),
    });
    place(endValue, { x: X1 - 60, y: yAt(data.series[0].balance.at(-1)) - 24, o: prog(t, 13.4, 0.3) });

    // Report and badges: 14.6-17.7.
    const repOn = life(t, 14.6, 17.7, 0.3, 0.4);
    place(report, {
      x: 560,
      y: 270 + (1 - ease.outCubic(prog(t, 14.6, 0.7))) * 700,
      r: -2 + prog(t, 14.6, 0.7) * 1,
      o: repOn,
    });
    [pillOffline, pillSaved, pillUndo].forEach((p, i) =>
      place(p, {
        x: 1440,
        y: 420 + i * 110,
        s: tw(t, 15.3 + i * 0.3, 0.4, 0.4, 1, ease.outBack),
        o: Math.min(prog(t, 15.3 + i * 0.3, 0.15), repOn),
      }),
    );

    // End.
    end.setAttribute('opacity', prog(t, 19.5, 0.5).toFixed(3));
    place(mark, { x: 940, y: 420, s: tw(t, 19.7, 0.6, 0.4, 1, ease.outBack), r: tw(t, 19.7, 0.6, -14, 0) });
    [title, tag, repo].forEach((e, i) =>
      place(e, { y: tw(t, 19.95 + i * 0.15, 0.5, 30, 0), o: prog(t, 19.95 + i * 0.15, 0.4) }),
    );

    const cap = CAPS.find(([a, b]) => t >= a && t <= b);
    if (cap) {
      const o = life(t, cap[0], cap[1], 0.25, 0.25);
      capText.textContent = cap[2];
      capBack.setAttribute('width', capWidth(cap[2]).toFixed(0));
      place(capText, { x: tw(t, cap[0], 0.4, -16, 0), o });
      place(capBack, { x: tw(t, cap[0], 0.4, -16, 0), o, r: 0 });
    } else {
      capText.setAttribute('opacity', 0);
      capBack.setAttribute('opacity', 0);
    }
  });

  attachPlayer(stage);
}
