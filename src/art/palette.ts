/**
 * UNDERWORLD-Palette. Alle Grafiken verwenden ausschließlich diese Farben,
 * damit der Stil einheitlich bleibt. Neue Farben nur hier ergänzen.
 */
export const P = {
  outline: '#2b1d2e',
  ink: '#1a1220',
  white: '#f6f1e7',
  cream: '#efe0c0',

  g0: '#24442f', g1: '#2f5a3a', g2: '#3f7a46', g3: '#5a9e4f', g4: '#86c25a', g5: '#c3e07a',

  b0: '#3a241f', b1: '#4a2f27', b2: '#6b4430', b3: '#8f5d3b', b4: '#b5824f', b5: '#d8b07a',

  soil0: '#36201c', soil1: '#4a2c22', soil2: '#5e3a2a', soil3: '#74492f',

  s0: '#2c2d3a', s1: '#3d3f4f', s2: '#5c6074', s3: '#8a8fa3', s4: '#c0c4d1',

  w0: '#1f3560', w1: '#2a4a7a', w2: '#3a6ea8', w3: '#5fa3d6', w4: '#a6d8f0',

  r0: '#5a1a2c', r1: '#7a2638', r2: '#b8394a', r3: '#e06a5a', r4: '#f2a08a',

  y0: '#a8642a', y1: '#e0a040', y2: '#f4d06a', y3: '#fff2b0',

  v0: '#2e1f45', v1: '#4b2f6b', v2: '#7a4bb0', v3: '#c07ae0',
  teal: '#3fd8c8', tealDark: '#1f8a88', pink: '#ff5fa8', pinkDark: '#b03070',

  skin0: '#f2c7a0', skin1: '#d9a07a', skin2: '#a8704e', skin3: '#6e4632',
  sand0: '#c9a66b', sand1: '#e2c48a',
} as const;

export type PaletteKey = keyof typeof P;
