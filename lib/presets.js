/**
 * Preset Library
 * ─────────────────────────────────────────────────────────────────
 * Every preset is a *parametric* description of an animation:
 *
 *   { id, name, group, family, duration, easing, params: { ... } }
 *
 * `family` selects the behaviour implemented in lib/core-engine.js, and
 * `params` tunes it. PARAM_SCHEMA below describes each family's parameters
 * (type, range, label) so the settings UI can be generated automatically —
 * adding a parameter to a family makes a control appear with no UI changes.
 */

// ═══ GROUPS ══════════════════════════════════════════════════════════

export const GROUPS = [
  { id: 'path', name: 'Path Drawing', icon: 'PenTool', blurb: 'Strokes that trace your logo’s outline before it fills in. Needs vector artwork.' },
  { id: 'pulse', name: 'Pulse & Breathe', icon: 'Activity', blurb: 'Calm, rhythmic scaling and fading that reads as “still working”.' },
  { id: 'spin', name: 'Spin & Rotate', icon: 'RotateCw', blurb: 'Continuous rotation, clock-like steps, flips and pendulum sways.' },
  { id: 'float', name: 'Float & Drift', icon: 'Wind', blurb: 'Weightless motion — bobbing, orbiting and lazy wandering.' },
  { id: 'entrance', name: 'Entrance & Pop', icon: 'Sparkles', blurb: 'Punchy arrivals with overshoot, bounce and spring.' },
  { id: 'light', name: 'Light & Glow', icon: 'Sun', blurb: 'Shimmer sweeps, wipes and soft blur dissolves.' },
  { id: 'orbit', name: 'Orbit & Rings', icon: 'Orbit', blurb: 'Satellites, sonar pings and expanding radar rings.' },
];

// ═══ PARAMETER SCHEMA ════════════════════════════════════════════════
// Controls are rendered in this order. `showIf` hides a control unless
// another parameter has one of the listed values.

const TIMING_EASINGS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'ease-out-expo', label: 'Expo Out' },
  { value: 'ease-out-back', label: 'Back Out' },
  { value: 'ease-out-circ', label: 'Circ Out' },
  { value: 'ease-in-out-circ', label: 'Circ In Out' },
  { value: 'ease-in-out-quart', label: 'Quart In Out' },
  { value: 'swift', label: 'Swift' },
];

/** Timing controls that apply to every preset regardless of family. */
export const TIMING_SCHEMA = [
  { key: 'duration', label: 'Duration', type: 'range', min: 400, max: 8000, step: 100, unit: 'ms' },
  { key: 'easing', label: 'Easing', type: 'select', options: TIMING_EASINGS },
  {
    key: 'direction', label: 'Direction', type: 'segmented', options: [
      { value: 'normal', label: 'Normal' },
      { value: 'reverse', label: 'Reverse' },
      { value: 'alternate', label: 'Alternate' },
    ]
  },
];

const DRAW_EASES = [
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'expoOut', label: 'Expo Out' },
  { value: 'circOut', label: 'Circ Out' },
  { value: 'linear', label: 'Linear' },
];

export const PARAM_SCHEMA = {
  'path-draw': [
    {
      key: 'mode', label: 'Stroke Mode', type: 'select', options: [
        { value: 'trace', label: 'Trace — grows from start' },
        { value: 'comet', label: 'Comet — dash travels along' },
        { value: 'march', label: 'March — repeating dashes' },
        { value: 'mirror', label: 'Mirror — grows from centre' },
        { value: 'erase', label: 'Erase — draws then retracts' },
      ]
    },
    { key: 'drawStart', label: 'Draw Start', type: 'range', min: 0, max: 0.9, step: 0.01, format: 'percent' },
    { key: 'drawEnd', label: 'Draw End', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'drawEase', label: 'Draw Curve', type: 'select', options: DRAW_EASES },
    { key: 'stagger', label: 'Stagger', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', hint: 'Delay each path after the previous one' },
    { key: 'strokeScale', label: 'Stroke Weight', type: 'range', min: 0.2, max: 6, step: 0.1, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px' },
    {
      key: 'colorMode', label: 'Stroke Colour', type: 'segmented', options: [
        { value: 'source', label: 'From logo' },
        { value: 'custom', label: 'Custom' },
      ]
    },
    { key: 'color', label: 'Colour', type: 'color', showIf: { colorMode: ['custom'] } },
    { key: 'tailLength', label: 'Tail Length', type: 'range', min: 0.02, max: 0.9, step: 0.01, format: 'percent', showIf: { mode: ['comet'] } },
    { key: 'dashLength', label: 'Dash Length', type: 'range', min: 2, max: 60, step: 1, showIf: { mode: ['march'] } },
    { key: 'dashGap', label: 'Dash Gap', type: 'range', min: 2, max: 60, step: 1, showIf: { mode: ['march'] } },
    { key: 'marchSpeed', label: 'March Speed', type: 'range', min: 0.5, max: 20, step: 0.5, unit: '×', showIf: { mode: ['march'] } },
    { key: 'headDot', label: 'Head Dot', type: 'range', min: 0, max: 12, step: 0.5, unit: 'px', showIf: { mode: ['trace'] } },
    { key: 'revealLogo', label: 'Reveal Logo', type: 'switch', hint: 'Fade the filled logo in behind the outline' },
    { key: 'logoFadeStart', label: 'Reveal Start', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', showIf: { revealLogo: [true] } },
    { key: 'logoFadeEnd', label: 'Reveal End', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', showIf: { revealLogo: [true] } },
    { key: 'holdEnd', label: 'Hold Until', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'opacity', label: 'Stroke Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
  ],

  'pulse': [
    { key: 'scaleMin', label: 'Min Scale', type: 'range', min: 0.5, max: 1, step: 0.01, unit: '×' },
    { key: 'scaleMax', label: 'Max Scale', type: 'range', min: 1, max: 1.8, step: 0.01, unit: '×' },
    { key: 'opacityMin', label: 'Min Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 1, max: 8, step: 1, hint: 'Beats per loop' },
    { key: 'blurMax', label: 'Blur', type: 'range', min: 0, max: 12, step: 0.5, unit: 'px' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color' },
  ],

  'float': [
    {
      key: 'mode', label: 'Path', type: 'select', options: [
        { value: 'bob', label: 'Bob — up and down' },
        { value: 'orbit', label: 'Orbit — elliptical' },
        { value: 'figure8', label: 'Figure 8' },
        { value: 'drift', label: 'Drift — lazy wander' },
      ]
    },
    { key: 'ampX', label: 'Horizontal Range', type: 'range', min: 0, max: 90, step: 1, unit: 'px' },
    { key: 'ampY', label: 'Vertical Range', type: 'range', min: 0, max: 90, step: 1, unit: 'px' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 1, max: 6, step: 1 },
    { key: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 30, step: 0.5, unit: '°' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.3, step: 0.01, unit: '×' },
    { key: 'fade', label: 'Fade Depth', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
  ],

  'spin': [
    {
      key: 'mode', label: 'Motion', type: 'select', options: [
        { value: 'continuous', label: 'Continuous — constant speed' },
        { value: 'eased', label: 'Eased — accelerate and settle' },
        { value: 'stepped', label: 'Stepped — ticks like a clock' },
        { value: 'flip', label: 'Flip — 3D card turn' },
      ]
    },
    { key: 'turns', label: 'Turns', type: 'range', min: 0.25, max: 6, step: 0.25, hint: 'Full rotations per loop' },
    { key: 'steps', label: 'Steps', type: 'range', min: 3, max: 24, step: 1, showIf: { mode: ['stepped'] } },
    { key: 'wobble', label: 'Wobble', type: 'range', min: 0, max: 40, step: 1, unit: '°' },
    { key: 'wobbleCycles', label: 'Wobble Rate', type: 'range', min: 0, max: 8, step: 1, showIf: { wobble: 'nonzero' } },
    { key: 'scalePulse', label: 'Scale Pulse', type: 'range', min: 0, max: 0.4, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color' },
  ],

  'swing': [
    { key: 'angle', label: 'Swing Angle', type: 'range', min: 0, max: 45, step: 0.5, unit: '°' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 1, max: 8, step: 1 },
    { key: 'shiftX', label: 'Sideways Shift', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.3, step: 0.01, unit: '×' },
    { key: 'damped', label: 'Damped', type: 'switch', hint: 'Settle to rest across the loop' },
  ],

  'pop': [
    { key: 'fromScale', label: 'Start Scale', type: 'range', min: 0, max: 1.5, step: 0.01, unit: '×' },
    { key: 'toScale', label: 'Exit Scale', type: 'range', min: 0.5, max: 2, step: 0.01, unit: '×' },
    { key: 'fromY', label: 'Start Offset Y', type: 'range', min: -160, max: 160, step: 1, unit: 'px' },
    { key: 'toY', label: 'Exit Offset Y', type: 'range', min: -160, max: 160, step: 1, unit: 'px' },
    { key: 'fromRotate', label: 'Start Rotation', type: 'range', min: -180, max: 180, step: 1, unit: '°' },
    { key: 'fromBlur', label: 'Start Blur', type: 'range', min: 0, max: 20, step: 0.5, unit: 'px' },
    { key: 'curve', label: 'Arrival Curve', type: 'select', options: [
      { value: 'backOut', label: 'Back Out — overshoot' },
      { value: 'elasticOut', label: 'Elastic — springy' },
      { value: 'bounce', label: 'Bounce' },
      { value: 'expoOut', label: 'Expo Out' },
      { value: 'easeOut', label: 'Ease Out' },
    ] },
    { key: 'inEnd', label: 'Arrive By', type: 'range', min: 0.1, max: 0.9, step: 0.01, format: 'percent' },
    { key: 'outStart', label: 'Exit From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'fadeOut', label: 'Fade Out', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
  ],

  'slide': [
    { key: 'distanceX', label: 'Distance X', type: 'range', min: -300, max: 300, step: 5, unit: 'px' },
    { key: 'distanceY', label: 'Distance Y', type: 'range', min: -300, max: 300, step: 5, unit: 'px' },
    { key: 'holdStart', label: 'Settle By', type: 'range', min: 0.05, max: 0.9, step: 0.01, format: 'percent' },
    { key: 'holdEnd', label: 'Leave From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'motionBlur', label: 'Motion Blur', type: 'range', min: 0, max: 20, step: 0.5, unit: 'px' },
  ],

  'dissolve': [
    { key: 'blurMax', label: 'Blur Depth', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px' },
    { key: 'opacityMin', label: 'Min Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'scaleAt', label: 'Scale At Peak', type: 'range', min: 0.7, max: 1.5, step: 0.01, unit: '×' },
  ],

  'wipe': [
    {
      key: 'direction', label: 'Direction', type: 'segmented', options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
        { value: 'up', label: 'Up' },
        { value: 'down', label: 'Down' },
      ]
    },
    { key: 'revealEnd', label: 'Reveal By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'hideStart', label: 'Hide From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'sweepLight', label: 'Edge Light', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'sweepWidth', label: 'Light Width', type: 'range', min: 0.02, max: 0.6, step: 0.01, format: 'percent', showIf: { sweepLight: 'nonzero' } },
    { key: 'sweepColor', label: 'Light Colour', type: 'color', showIf: { sweepLight: 'nonzero' } },
  ],

  'rings': [
    { key: 'count', label: 'Ring Count', type: 'range', min: 1, max: 8, step: 1 },
    { key: 'radiusMin', label: 'Start Radius', type: 'range', min: 10, max: 250, step: 2, unit: 'px' },
    { key: 'radiusMax', label: 'End Radius', type: 'range', min: 40, max: 400, step: 2, unit: 'px' },
    { key: 'width', label: 'Ring Weight', type: 'range', min: 0.5, max: 16, step: 0.5, unit: 'px' },
    { key: 'color', label: 'Ring Colour', type: 'color' },
    { key: 'opacity', label: 'Ring Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Ring Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'logoScale', label: 'Logo Pulse', type: 'range', min: 1, max: 1.4, step: 0.01, unit: '×' },
    { key: 'logoGlow', label: 'Logo Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
  ],

  'orbit': [
    { key: 'count', label: 'Satellites', type: 'range', min: 1, max: 12, step: 1 },
    { key: 'radius', label: 'Orbit Radius', type: 'range', min: 40, max: 260, step: 2, unit: 'px' },
    { key: 'dotSize', label: 'Dot Size', type: 'range', min: 1, max: 24, step: 0.5, unit: 'px' },
    { key: 'turns', label: 'Turns', type: 'range', min: 0.25, max: 5, step: 0.25 },
    { key: 'trail', label: 'Trail Length', type: 'range', min: 0, max: 12, step: 1, hint: 'Ghost dots behind each satellite' },
    { key: 'squash', label: 'Ellipse', type: 'range', min: 0.05, max: 1, step: 0.05, hint: '1 is a circle, lower tilts the orbit' },
    { key: 'color', label: 'Dot Colour', type: 'color' },
    { key: 'glow', label: 'Dot Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'opacity', label: 'Dot Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'layer', label: 'Draw Above Logo', type: 'segmented', options: [
      { value: 'below', label: 'Behind' },
      { value: 'above', label: 'In front' },
    ] },
    { key: 'logoTurns', label: 'Logo Rotation', type: 'range', min: 0, max: 3, step: 0.25 },
    { key: 'scaleAmp', label: 'Logo Pulse', type: 'range', min: 0, max: 0.3, step: 0.01, unit: '×' },
  ],

  'heartbeat': [
    { key: 'scaleMax', label: 'Beat Scale', type: 'range', min: 1, max: 1.6, step: 0.01, unit: '×' },
    { key: 'opacityMin', label: 'Rest Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 50, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color' },
  ],

  'shimmer': [
    { key: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'width', label: 'Band Width', type: 'range', min: 0.02, max: 0.8, step: 0.01, format: 'percent' },
    { key: 'angle', label: 'Angle', type: 'range', min: -90, max: 90, step: 1, unit: '°' },
    { key: 'color', label: 'Light Colour', type: 'color' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.2, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Logo Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
  ],
};

// ═══ PRESETS ═════════════════════════════════════════════════════════

const p = (id, name, group, family, duration, easing, params, tag) =>
  ({ id, name, group, family, duration, easing, params, tag });

export const PRESETS = [

  // ─── PATH DRAWING ───────────────────────────────────────────────
  p('trace-classic', 'Classic Trace', 'path', 'path-draw', 3200, 'linear', {
    mode: 'trace', drawStart: 0.02, drawEnd: 0.55, drawEase: 'easeInOut', stagger: 0,
    strokeScale: 1, glow: 0, colorMode: 'source', revealLogo: true,
    logoFadeStart: 0.5, logoFadeEnd: 0.72, holdEnd: 0.82, fadeEnd: 0.94, opacity: 1,
  }, 'Signature'),

  p('trace-neon', 'Neon Trace', 'path', 'path-draw', 3000, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 0.5, drawEase: 'expoOut', stagger: 0,
    strokeScale: 1.4, glow: 14, colorMode: 'custom', color: '#22d3ee',
    revealLogo: true, logoFadeStart: 0.45, logoFadeEnd: 0.68, holdEnd: 0.85, fadeEnd: 0.96, opacity: 1,
  }, 'Popular'),

  p('trace-comet', 'Comet Run', 'path', 'path-draw', 2600, 'linear', {
    mode: 'comet', drawStart: 0, drawEnd: 1, drawEase: 'linear', tailLength: 0.22,
    strokeScale: 1.6, glow: 18, colorMode: 'custom', color: '#a78bfa',
    revealLogo: false, holdEnd: 1, fadeEnd: 1, opacity: 1,
  }, 'Popular'),

  p('trace-stagger', 'Cascade', 'path', 'path-draw', 3600, 'linear', {
    mode: 'trace', drawStart: 0.02, drawEnd: 0.62, drawEase: 'easeOut', stagger: 0.75,
    strokeScale: 1.1, glow: 4, colorMode: 'source',
    revealLogo: true, logoFadeStart: 0.6, logoFadeEnd: 0.8, holdEnd: 0.88, fadeEnd: 0.97, opacity: 1,
  }),

  p('trace-headlight', 'Headlight', 'path', 'path-draw', 3000, 'linear', {
    mode: 'trace', drawStart: 0.02, drawEnd: 0.6, drawEase: 'easeInOut', headDot: 5,
    headColor: '#ffffff', strokeScale: 1.2, glow: 10, colorMode: 'custom', color: '#f472b6',
    revealLogo: true, logoFadeStart: 0.58, logoFadeEnd: 0.78, holdEnd: 0.88, fadeEnd: 0.97, opacity: 1,
  }, 'New'),

  p('trace-mirror', 'Mirror Bloom', 'path', 'path-draw', 3000, 'linear', {
    mode: 'mirror', drawStart: 0.03, drawEnd: 0.55, drawEase: 'circOut',
    strokeScale: 1.3, glow: 8, colorMode: 'custom', color: '#34d399',
    revealLogo: true, logoFadeStart: 0.5, logoFadeEnd: 0.72, holdEnd: 0.86, fadeEnd: 0.96, opacity: 1,
  }),

  p('trace-erase', 'Draw & Erase', 'path', 'path-draw', 3400, 'linear', {
    mode: 'erase', drawStart: 0, drawEnd: 1, drawEase: 'easeInOut',
    strokeScale: 1.2, glow: 6, colorMode: 'custom', color: '#8b5cf6',
    revealLogo: false, holdEnd: 1, fadeEnd: 1, opacity: 1,
  }),

  p('trace-march', 'Marching Ants', 'path', 'path-draw', 2400, 'linear', {
    mode: 'march', dashLength: 10, dashGap: 12, marchSpeed: 6,
    strokeScale: 1, glow: 0, colorMode: 'source',
    revealLogo: true, logoFadeStart: 0.1, logoFadeEnd: 0.3, holdEnd: 1, fadeEnd: 1, opacity: 0.9,
  }),

  p('trace-blueprint', 'Blueprint', 'path', 'path-draw', 4000, 'linear', {
    mode: 'trace', drawStart: 0.02, drawEnd: 0.7, drawEase: 'linear', stagger: 0.5,
    strokeScale: 0.8, glow: 3, colorMode: 'custom', color: '#60a5fa', lineCap: 'butt',
    revealLogo: true, logoFadeStart: 0.72, logoFadeEnd: 0.9, holdEnd: 0.94, fadeEnd: 1, opacity: 0.95,
  }),

  p('trace-signature', 'Signature Ink', 'path', 'path-draw', 3400, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 0.58, drawEase: 'easeInOut', stagger: 0.9,
    strokeScale: 1.5, glow: 0, colorMode: 'custom', color: '#0f172a',
    revealLogo: false, holdEnd: 0.92, fadeEnd: 1, opacity: 1,
  }),

  p('trace-electric', 'Electric Outline', 'path', 'path-draw', 2200, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 0.4, drawEase: 'expoOut',
    strokeScale: 2, glow: 26, colorMode: 'custom', color: '#facc15',
    revealLogo: true, logoFadeStart: 0.38, logoFadeEnd: 0.55, holdEnd: 0.8, fadeEnd: 0.95, opacity: 1,
  }, 'New'),

  p('trace-ghost', 'Ghost Outline', 'path', 'path-draw', 3800, 'linear', {
    mode: 'trace', drawStart: 0.05, drawEnd: 0.65, drawEase: 'easeInOut',
    strokeScale: 0.7, glow: 12, colorMode: 'custom', color: '#e2e8f0',
    revealLogo: true, logoFadeStart: 0.62, logoFadeEnd: 0.85, holdEnd: 0.9, fadeEnd: 1, opacity: 0.6,
  }),

  p('trace-dual-comet', 'Twin Comets', 'path', 'path-draw', 2800, 'linear', {
    mode: 'comet', drawStart: 0, drawEnd: 1, drawEase: 'linear', tailLength: 0.12,
    stagger: 0.5, strokeScale: 2, glow: 22, colorMode: 'custom', color: '#f97316',
    revealLogo: false, holdEnd: 1, fadeEnd: 1, opacity: 1,
  }),

  p('trace-thin-luxe', 'Thin Luxe', 'path', 'path-draw', 4200, 'linear', {
    mode: 'trace', drawStart: 0.04, drawEnd: 0.62, drawEase: 'circOut', stagger: 0.3,
    strokeScale: 0.5, glow: 6, colorMode: 'custom', color: '#d4af37',
    revealLogo: true, logoFadeStart: 0.6, logoFadeEnd: 0.84, holdEnd: 0.9, fadeEnd: 1, opacity: 1,
  }),

  p('trace-loop-forever', 'Endless Line', 'path', 'path-draw', 3000, 'linear', {
    mode: 'comet', drawStart: 0, drawEnd: 1, drawEase: 'linear', tailLength: 0.45,
    strokeScale: 1.2, glow: 10, colorMode: 'custom', color: '#38bdf8',
    revealLogo: true, logoFadeStart: 0.05, logoFadeEnd: 0.25, holdEnd: 1, fadeEnd: 1, opacity: 0.85,
  }),

  p('trace-bold-sketch', 'Bold Sketch', 'path', 'path-draw', 2800, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 0.5, drawEase: 'easeOut', stagger: 0.4,
    strokeScale: 3, glow: 0, colorMode: 'source', lineCap: 'square',
    revealLogo: true, logoFadeStart: 0.48, logoFadeEnd: 0.66, holdEnd: 0.84, fadeEnd: 0.96, opacity: 1,
  }),

  // ─── PULSE & BREATHE ────────────────────────────────────────────
  p('pulse-soft', 'Soft Breathe', 'pulse', 'pulse', 3000, 'ease-in-out', {
    scaleMin: 0.96, scaleMax: 1.04, opacityMin: 0.78, opacityMax: 1, cycles: 1, glow: 0,
  }, 'Signature'),

  p('pulse-glow', 'Glow Pulse', 'pulse', 'pulse', 2400, 'ease-in-out', {
    scaleMin: 0.98, scaleMax: 1.06, opacityMin: 0.9, opacityMax: 1, cycles: 1,
    glow: 26, glowColor: '#8b5cf6',
  }, 'Popular'),

  p('pulse-heartbeat', 'Heartbeat', 'pulse', 'heartbeat', 1600, 'linear', {
    scaleMax: 1.16, opacityMin: 0.95, glow: 18, glowColor: '#f43f5e',
  }, 'Popular'),

  p('pulse-double', 'Double Tap', 'pulse', 'pulse', 2200, 'ease-in-out', {
    scaleMin: 0.94, scaleMax: 1.1, opacityMin: 0.88, opacityMax: 1, cycles: 2, glow: 0,
  }),

  p('pulse-focus', 'Focus Pull', 'pulse', 'pulse', 2800, 'ease-in-out', {
    scaleMin: 1, scaleMax: 1.02, opacityMin: 1, opacityMax: 1, cycles: 1,
    blurMax: 7, glow: 0,
  }, 'New'),

  p('pulse-throb', 'Deep Throb', 'pulse', 'pulse', 1800, 'ease-in-out', {
    scaleMin: 0.86, scaleMax: 1.14, opacityMin: 0.7, opacityMax: 1, cycles: 1, glow: 12, glowColor: '#a78bfa',
  }),

  p('pulse-ember', 'Ember', 'pulse', 'pulse', 3600, 'ease-in-out', {
    scaleMin: 0.99, scaleMax: 1.03, opacityMin: 0.6, opacityMax: 1, cycles: 3,
    glow: 30, glowColor: '#fb923c',
  }),

  p('pulse-dissolve', 'Soft Dissolve', 'pulse', 'dissolve', 3200, 'ease-in-out', {
    blurMax: 9, opacityMin: 0.2, scaleAt: 1.08,
  }),

  // ─── SPIN & ROTATE ──────────────────────────────────────────────
  p('spin-smooth', 'Smooth Spin', 'spin', 'spin', 2400, 'linear', {
    mode: 'continuous', turns: 1, wobble: 0, scalePulse: 0, glow: 0,
  }, 'Signature'),

  p('spin-settle', 'Spin & Settle', 'spin', 'spin', 2600, 'ease-out-expo', {
    mode: 'eased', turns: 2, wobble: 0, scalePulse: 0.05, glow: 0,
  }, 'Popular'),

  p('spin-tick', 'Clock Tick', 'spin', 'spin', 3000, 'linear', {
    mode: 'stepped', turns: 1, steps: 12, wobble: 0, scalePulse: 0, glow: 0,
  }, 'New'),

  p('spin-flip', 'Card Flip', 'spin', 'spin', 2200, 'linear', {
    mode: 'flip', turns: 1, wobble: 0, scalePulse: 0, glow: 0,
  }, 'New'),

  p('spin-neon', 'Neon Rotor', 'spin', 'spin', 2000, 'linear', {
    mode: 'continuous', turns: 1, wobble: 0, scalePulse: 0.06,
    glow: 24, glowColor: '#22d3ee',
  }),

  p('spin-wobble', 'Wobble Spin', 'spin', 'spin', 3000, 'linear', {
    mode: 'continuous', turns: 1, wobble: 14, wobbleCycles: 4, scalePulse: 0.04, glow: 0,
  }),

  p('spin-swing', 'Pendulum', 'spin', 'swing', 2600, 'ease-in-out', {
    angle: 14, cycles: 2, shiftX: 0, scaleAmp: 0.02, damped: false,
  }),

  p('spin-settle-swing', 'Settling Sway', 'spin', 'swing', 3200, 'linear', {
    angle: 22, cycles: 4, shiftX: 8, scaleAmp: 0.03, damped: true,
  }),

  // ─── FLOAT & DRIFT ──────────────────────────────────────────────
  p('float-bob', 'Gentle Bob', 'float', 'float', 3000, 'linear', {
    mode: 'bob', ampX: 0, ampY: 14, cycles: 1, tilt: 0, scaleAmp: 0, fade: 0.1,
  }, 'Signature'),

  p('float-orbit', 'Soft Orbit', 'float', 'float', 4000, 'linear', {
    mode: 'orbit', ampX: 16, ampY: 16, cycles: 1, tilt: 4, scaleAmp: 0.03, fade: 0,
  }, 'Popular'),

  p('float-figure8', 'Figure Eight', 'float', 'float', 4400, 'linear', {
    mode: 'figure8', ampX: 26, ampY: 26, cycles: 1, tilt: 6, scaleAmp: 0.02, fade: 0,
  }, 'New'),

  p('float-drift', 'Lazy Drift', 'float', 'float', 5200, 'linear', {
    mode: 'drift', ampX: 20, ampY: 12, cycles: 1, tilt: 3, scaleAmp: 0.04, fade: 0.08,
  }),

  p('float-hover', 'Hover Card', 'float', 'float', 3400, 'linear', {
    mode: 'bob', ampX: 0, ampY: 9, cycles: 1, tilt: 5, scaleAmp: 0.05, fade: 0,
  }),

  p('float-balloon', 'Balloon', 'float', 'float', 4800, 'linear', {
    mode: 'drift', ampX: 30, ampY: 22, cycles: 1, tilt: 10, scaleAmp: 0.06, fade: 0.12,
  }),

  p('float-slide-through', 'Slide Through', 'float', 'slide', 2600, 'linear', {
    distanceX: 180, distanceY: 0, holdStart: 0.32, holdEnd: 0.68, motionBlur: 5,
  }),

  // ─── ENTRANCE & POP ─────────────────────────────────────────────
  p('pop-classic', 'Elastic Pop', 'entrance', 'pop', 2200, 'linear', {
    fromScale: 0.4, toScale: 1.1, fromY: 0, toY: 0, fromRotate: 0, fromBlur: 0,
    curve: 'backOut', inEnd: 0.42, outStart: 0.78, fadeInEnd: 0.16, fadeOut: 1,
  }, 'Signature'),

  p('pop-spring', 'Spring In', 'entrance', 'pop', 2600, 'linear', {
    fromScale: 0.2, toScale: 1, fromY: 0, toY: 0, fromRotate: 0, fromBlur: 0,
    curve: 'elasticOut', inEnd: 0.55, outStart: 0.84, fadeInEnd: 0.12, fadeOut: 1,
  }, 'Popular'),

  p('pop-drop', 'Drop In', 'entrance', 'pop', 2400, 'linear', {
    fromScale: 0.8, toScale: 1, fromY: -140, toY: 30, fromRotate: 0, fromBlur: 0,
    curve: 'bounce', inEnd: 0.5, outStart: 0.82, fadeInEnd: 0.1, fadeOut: 1,
  }, 'Popular'),

  p('pop-rise', 'Rise Up', 'entrance', 'pop', 2400, 'linear', {
    fromScale: 0.9, toScale: 1.04, fromY: 70, toY: -40, fromRotate: 0, fromBlur: 0,
    curve: 'expoOut', inEnd: 0.45, outStart: 0.76, fadeInEnd: 0.2, fadeOut: 1,
  }),

  p('pop-unblur', 'Focus In', 'entrance', 'pop', 2600, 'linear', {
    fromScale: 1.15, toScale: 1, fromY: 0, toY: 0, fromRotate: 0, fromBlur: 14,
    curve: 'expoOut', inEnd: 0.5, outStart: 0.82, fadeInEnd: 0.25, fadeOut: 1,
  }, 'New'),

  p('pop-twist', 'Twist In', 'entrance', 'pop', 2600, 'linear', {
    fromScale: 0.3, toScale: 1.08, fromY: 0, toY: 0, fromRotate: -140, fromBlur: 0,
    curve: 'backOut', inEnd: 0.5, outStart: 0.8, fadeInEnd: 0.15, fadeOut: 1,
  }, 'New'),

  p('pop-slam', 'Slam', 'entrance', 'pop', 1800, 'linear', {
    fromScale: 2.2, toScale: 0.9, fromY: 0, toY: 0, fromRotate: 0, fromBlur: 8,
    curve: 'expoOut', inEnd: 0.3, outStart: 0.78, fadeInEnd: 0.08, fadeOut: 1,
  }),

  p('pop-swipe', 'Swipe In', 'entrance', 'slide', 2200, 'linear', {
    distanceX: 160, distanceY: 0, holdStart: 0.35, holdEnd: 0.7, motionBlur: 8,
  }),

  // ─── LIGHT & GLOW ───────────────────────────────────────────────
  p('light-wipe', 'Light Wipe', 'light', 'wipe', 3000, 'linear', {
    direction: 'left', revealEnd: 0.45, hideStart: 0.82, sweepLight: 0.7,
    sweepWidth: 0.16, sweepColor: '#ffffff',
  }, 'New'),

  p('light-wipe-up', 'Rise Wipe', 'light', 'wipe', 3000, 'linear', {
    direction: 'up', revealEnd: 0.5, hideStart: 0.85, sweepLight: 0.5,
    sweepWidth: 0.2, sweepColor: '#a78bfa',
  }),

  p('light-dissolve', 'Blur Dissolve', 'light', 'dissolve', 3000, 'ease-in-out', {
    blurMax: 12, opacityMin: 0.15, scaleAt: 1.1,
  }),

  // ─── ORBIT & RINGS ──────────────────────────────────────────────
  p('orbit-electron', 'Electron', 'orbit', 'orbit', 2000, 'linear', {
    count: 2, radius: 160, dotSize: 5, turns: 2, trail: 8, squash: 0.35,
    color: '#f472b6', glow: 16, opacity: 1, layer: 'above', logoTurns: 0, scaleAmp: 0.03,
  }, 'New'),

  p('rings-sonar', 'Sonar', 'orbit', 'rings', 2600, 'linear', {
    count: 3, radiusMin: 100, radiusMax: 210, width: 2, color: '#22d3ee',
    opacity: 0.8, glow: 10, logoScale: 1.04, logoGlow: 0,
  }, 'Popular'),

  p('rings-radar', 'Radar Ping', 'orbit', 'rings', 2000, 'linear', {
    count: 2, radiusMin: 90, radiusMax: 240, width: 3, color: '#4ade80',
    opacity: 0.9, glow: 14, logoScale: 1.06, logoGlow: 10,
  }),

  p('rings-ripple', 'Ripple', 'orbit', 'rings', 3400, 'linear', {
    count: 5, radiusMin: 110, radiusMax: 200, width: 1.5, color: '#8b5cf6',
    opacity: 0.6, glow: 0, logoScale: 1.02, logoGlow: 0,
  }),

  p('rings-halo', 'Halo', 'orbit', 'rings', 3000, 'linear', {
    count: 1, radiusMin: 125, radiusMax: 150, width: 8, color: '#fcd34d',
    opacity: 0.7, glow: 26, logoScale: 1.05, logoGlow: 18,
  }, 'New'),
];

export const TOTAL_PRESETS = PRESETS.length;

/** Presets bucketed by group id, in GROUPS order. */
export const PRESETS_BY_GROUP = GROUPS.map((g) => ({
  ...g,
  presets: PRESETS.filter((preset) => preset.group === g.id),
}));

export const DEFAULT_PRESET_ID = 'trace-classic';

export function getPreset(id) {
  return PRESETS.find((preset) => preset.id === id) || PRESETS[0];
}

export function getGroup(id) {
  return GROUPS.find((g) => g.id === id) || GROUPS[0];
}

/** The parameter controls that apply to a given preset. */
export function getParamSchema(preset) {
  return PARAM_SCHEMA[preset.family] || [];
}

/**
 * Should a control be visible given the current parameter values?
 * `showIf: { key: [values] }` or `showIf: { key: 'nonzero' }`.
 */
export function isParamVisible(control, params) {
  if (!control.showIf) return true;
  return Object.entries(control.showIf).every(([key, want]) => {
    const actual = params[key];
    if (want === 'nonzero') return Number(actual) > 0;
    return want.includes(actual);
  });
}

/**
 * Builds the animation object handed to the engine and to every exporter.
 * This is the single place preview and export settings are reconciled, so the
 * two can never disagree about speed, background or parameters.
 */
export function resolveAnimation(preset, overrides = {}, background = null) {
  const speed = Number(overrides.speed) > 0 ? Number(overrides.speed) : 1;
  const duration = Number(overrides.duration) > 0 ? Number(overrides.duration) : preset.duration;
  return {
    presetId: preset.id,
    name: preset.name,
    family: preset.family,
    easing: overrides.easing || preset.easing,
    direction: overrides.direction || 'normal',
    duration: Math.max(100, duration / speed),
    params: { ...preset.params, ...(overrides.params || {}) },
    backgroundColor: background,
  };
}
