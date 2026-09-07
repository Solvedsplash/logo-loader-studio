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
  { id: 'ink', name: 'Ink & Handwriting', icon: 'PenLine', blurb: 'A nib writes your mark stroke by stroke, then the ink settles. Needs vector artwork.' },
  { id: 'path', name: 'Path Drawing', icon: 'PenTool', blurb: 'Strokes that trace your logo’s outline before it fills in. Needs vector artwork.' },
  { id: 'reveal', name: 'Reveal & Assemble', icon: 'LayoutGrid', blurb: 'Tiles, bands and pixels resolving into the finished mark.' },
  { id: 'fill', name: 'Fill & Colour', icon: 'PaintBucket', blurb: 'Liquid pours and gradients flowing through the artwork itself.' },
  { id: 'fx', name: 'Signature FX', icon: 'Wand2', blurb: 'Glass shines, liquid morphs, waves, glitches and spring snaps.' },
  { id: 'entrance', name: 'Entrance & Pop', icon: 'Sparkles', blurb: 'Punchy arrivals with overshoot, bounce, spring and zoom streaks.' },
  { id: 'orbit', name: 'Orbit & Rings', icon: 'Orbit', blurb: 'Satellites, sonar pings and expanding radar rings.' },
  { id: 'spin', name: 'Spin & Rotate', icon: 'RotateCw', blurb: 'Continuous rotation, clock-like steps, flips and pendulum sways.' },
  { id: 'pulse', name: 'Pulse & Breathe', icon: 'Activity', blurb: 'Calm, rhythmic scaling and fading that reads as “still working”.' },
  { id: 'float', name: 'Float & Drift', icon: 'Wind', blurb: 'Weightless motion — bobbing, orbiting and lazy wandering.' },
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
    { key: 'glowLayers', label: 'Glow Layers', type: 'range', min: 1, max: 5, step: 1, hint: 'Stacked passes build a soft bloom instead of a flat halo', showIf: { glow: 'nonzero' } },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
    { key: 'trimStart', label: 'Trim Start', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', hint: 'Independent window on the stroke, like a Lottie trim path' },
    { key: 'trimEnd', label: 'Trim End', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'trimOffset', label: 'Trim Offset', type: 'range', min: -1, max: 1, step: 0.01, format: 'percent', hint: 'Rotates the window around the path' },
    { key: 'trimSpin', label: 'Trim Spin', type: 'range', min: -4, max: 4, step: 0.25, hint: 'Loops the trim window around the path per cycle' },
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

  'jelly': [
    { key: 'squash', label: 'Squash', type: 'range', min: 0, max: 0.6, step: 0.01, hint: 'X and Y move opposite, so volume stays constant' },
    { key: 'bounces', label: 'Wobbles', type: 'range', min: 1, max: 8, step: 1 },
    { key: 'damping', label: 'Damping', type: 'range', min: 0, max: 8, step: 0.2, hint: 'How fast the wobble settles' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 1, max: 5, step: 1 },
    { key: 'lift', label: 'Lift', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
    { key: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 20, step: 0.5, unit: '°' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'bounce': [
    { key: 'height', label: 'Hop Height', type: 'range', min: 10, max: 180, step: 2, unit: 'px' },
    { key: 'hops', label: 'Hops', type: 'range', min: 1, max: 6, step: 1 },
    { key: 'squash', label: 'Impact Squash', type: 'range', min: 0, max: 0.6, step: 0.01, hint: 'Only applied near the ground' },
    { key: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 20, step: 0.5, unit: '°' },
    { key: 'shadow', label: 'Contact Shadow', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
    { key: 'shadowColor', label: 'Shadow Colour', type: 'color', showIf: { shadow: 'nonzero' } },
  ],

  'flip3d': [
    {
      key: 'axis', label: 'Axis', type: 'segmented', options: [
        { value: 'y', label: 'Vertical' },
        { value: 'x', label: 'Horizontal' },
      ]
    },
    { key: 'turns', label: 'Turns', type: 'range', min: 0.5, max: 4, step: 0.5 },
    { key: 'perspective', label: 'Perspective', type: 'range', min: 0, max: 30, step: 0.5, unit: '°' },
    { key: 'backShade', label: 'Back Shading', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', hint: 'Dims the reverse side so it reads as one solid card' },
    { key: 'edgeFade', label: 'Edge Fade', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'lift', label: 'Lift', type: 'range', min: 0, max: 0.4, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'iris': [
    {
      key: 'shape', label: 'Aperture', type: 'select', options: [
        { value: 'circle', label: 'Circle' },
        { value: 'diamond', label: 'Diamond' },
        { value: 'blades', label: 'Shutter blades' },
      ]
    },
    { key: 'blades', label: 'Blade Count', type: 'range', min: 3, max: 12, step: 1, showIf: { shape: ['blades'] } },
    { key: 'spin', label: 'Aperture Spin', type: 'range', min: -3, max: 3, step: 0.25, showIf: { shape: ['blades'] } },
    { key: 'originX', label: 'Origin X', type: 'range', min: -1, max: 1, step: 0.05 },
    { key: 'originY', label: 'Origin Y', type: 'range', min: -1, max: 1, step: 0.05 },
    { key: 'fromScale', label: 'Start Scale', type: 'range', min: 0.2, max: 2, step: 0.01, unit: '×' },
    { key: 'fromRotate', label: 'Start Rotation', type: 'range', min: -180, max: 180, step: 5, unit: '°' },
    { key: 'end', label: 'Open By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'closeStart', label: 'Close From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'curve', label: 'Curve', type: 'select', options: DRAW_EASES },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
  ],

  'confetti': [
    { key: 'count', label: 'Flake Count', type: 'range', min: 4, max: 120, step: 2 },
    { key: 'velocity', label: 'Launch Speed', type: 'range', min: 40, max: 500, step: 10 },
    { key: 'gravity', label: 'Gravity', type: 'range', min: 0, max: 700, step: 20 },
    { key: 'size', label: 'Flake Size', type: 'range', min: 2, max: 20, step: 0.5, unit: 'px' },
    { key: 'spin', label: 'Flake Spin', type: 'range', min: 0, max: 10, step: 0.5 },
    { key: 'life', label: 'Lifetime', type: 'range', min: 0.2, max: 1, step: 0.05, format: 'percent' },
    { key: 'burstAt', label: 'Burst At', type: 'range', min: 0.02, max: 0.8, step: 0.01, format: 'percent' },
    {
      key: 'shape', label: 'Flake Shape', type: 'segmented', options: [
        { value: 'rect', label: 'Rectangle' },
        { value: 'circle', label: 'Circle' },
      ]
    },
    { key: 'colorA', label: 'Colour 1', type: 'color' },
    { key: 'colorB', label: 'Colour 2', type: 'color' },
    { key: 'colorC', label: 'Colour 3', type: 'color' },
    { key: 'colorD', label: 'Colour 4', type: 'color' },
    { key: 'fromScale', label: 'Logo Pop From', type: 'range', min: 0, max: 1.5, step: 0.05, unit: '×' },
    { key: 'opacity', label: 'Flake Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Logo Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
  ],

  'handwrite': [
    { key: 'writeStart', label: 'Start Writing', type: 'range', min: 0, max: 0.6, step: 0.01, format: 'percent' },
    { key: 'writeEnd', label: 'Finish Writing', type: 'range', min: 0.2, max: 1, step: 0.01, format: 'percent' },
    { key: 'strokeGap', label: 'Pen Lift', type: 'range', min: 0, max: 0.6, step: 0.01, format: 'percent', hint: 'Pause between strokes as the pen lifts' },
    { key: 'nibSize', label: 'Nib Size', type: 'range', min: 0, max: 14, step: 0.5, unit: 'px' },
    { key: 'nibColor', label: 'Nib Colour', type: 'color', showIf: { nibSize: 'nonzero' } },
    { key: 'pressure', label: 'Pen Pressure', type: 'range', min: 0, max: 1.5, step: 0.05, hint: 'Swells the stroke through the middle of each travel' },
    { key: 'strokeScale', label: 'Ink Weight', type: 'range', min: 0.2, max: 6, step: 0.1, unit: '×' },
    {
      key: 'colorMode', label: 'Ink Colour', type: 'segmented', options: [
        { value: 'source', label: 'From logo' },
        { value: 'custom', label: 'Custom' },
      ]
    },
    { key: 'color', label: 'Colour', type: 'color', showIf: { colorMode: ['custom'] } },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px' },
    { key: 'glowLayers', label: 'Glow Layers', type: 'range', min: 1, max: 5, step: 1, showIf: { glow: 'nonzero' } },
    { key: 'revealLogo', label: 'Settle Logo In', type: 'switch', hint: 'Fade the filled logo in once writing finishes' },
    { key: 'logoFadeStart', label: 'Settle Start', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', showIf: { revealLogo: [true] } },
    { key: 'logoFadeEnd', label: 'Settle End', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', showIf: { revealLogo: [true] } },
    { key: 'holdEnd', label: 'Hold Until', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
  ],

  'liquid-fill': [
    { key: 'color', label: 'Liquid Colour', type: 'color' },
    { key: 'fillStart', label: 'Pour From', type: 'range', min: 0, max: 0.8, step: 0.01, format: 'percent' },
    { key: 'fillEnd', label: 'Full By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'waveHeight', label: 'Wave Height', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px' },
    { key: 'waveCount', label: 'Wave Count', type: 'range', min: 0.5, max: 8, step: 0.25 },
    { key: 'waveSpeed', label: 'Wave Speed', type: 'range', min: 0, max: 6, step: 0.25, unit: '×' },
    { key: 'ghost', label: 'Empty Level', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', hint: 'How visible the unfilled logo stays' },
    { key: 'drain', label: 'Drain At End', type: 'switch' },
    { key: 'curve', label: 'Fill Curve', type: 'select', options: DRAW_EASES },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.2, step: 0.01, unit: '×' },
  ],

  'gradient-sweep': [
    { key: 'colorA', label: 'Colour 1', type: 'color' },
    { key: 'colorB', label: 'Colour 2', type: 'color' },
    { key: 'colorC', label: 'Colour 3', type: 'color' },
    { key: 'angle', label: 'Angle', type: 'range', min: -90, max: 90, step: 1, unit: '°' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 0.25, max: 4, step: 0.25 },
    { key: 'intensity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.2, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
  ],

  'shatter': [
    {
      key: 'mode', label: 'Direction', type: 'segmented', options: [
        { value: 'assemble', label: 'Assemble' },
        { value: 'scatter', label: 'Scatter' },
      ]
    },
    { key: 'columns', label: 'Columns', type: 'range', min: 2, max: 24, step: 1 },
    { key: 'rows', label: 'Rows', type: 'range', min: 2, max: 24, step: 1 },
    { key: 'distance', label: 'Travel', type: 'range', min: 10, max: 320, step: 5, unit: 'px' },
    { key: 'spin', label: 'Tile Spin', type: 'range', min: 0, max: 180, step: 5, unit: '°' },
    { key: 'stagger', label: 'Stagger', type: 'range', min: 0, max: 0.95, step: 0.01, format: 'percent' },
    {
      key: 'origin', label: 'Scatter Pattern', type: 'segmented', options: [
        { value: 'random', label: 'Random' },
        { value: 'radial', label: 'Radial' },
      ]
    },
    { key: 'fade', label: 'Fade Tiles', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'curve', label: 'Curve', type: 'select', options: DRAW_EASES },
    { key: 'end', label: 'Complete By', type: 'range', min: 0.2, max: 1, step: 0.01, format: 'percent' },
  ],

  'pixelate': [
    { key: 'minBlocks', label: 'Coarsest', type: 'range', min: 2, max: 40, step: 1, hint: 'Block count at the blurriest point' },
    { key: 'maxBlocks', label: 'Finest', type: 'range', min: 20, max: 300, step: 5 },
    { key: 'steps', label: 'Resolution Steps', type: 'range', min: 2, max: 20, step: 1, hint: 'Quantised so it steps rather than slides' },
    { key: 'start', label: 'Start', type: 'range', min: 0, max: 0.8, step: 0.01, format: 'percent' },
    { key: 'end', label: 'Sharp By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'exitStart', label: 'Re-blur From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'curve', label: 'Curve', type: 'select', options: DRAW_EASES },
  ],

  'bands': [
    {
      key: 'axis', label: 'Band Axis', type: 'segmented', options: [
        { value: 'vertical', label: 'Vertical' },
        { value: 'horizontal', label: 'Horizontal' },
      ]
    },
    { key: 'count', label: 'Band Count', type: 'range', min: 2, max: 40, step: 1 },
    { key: 'overlap', label: 'Cross-fade', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'slide', label: 'Slide In', type: 'range', min: 0, max: 120, step: 2, unit: 'px' },
    {
      key: 'order', label: 'Order', type: 'segmented', options: [
        { value: 'forward', label: 'Forward' },
        { value: 'reverse', label: 'Reverse' },
        { value: 'centre', label: 'Centre' },
      ]
    },
    { key: 'end', label: 'Complete By', type: 'range', min: 0.2, max: 1, step: 0.01, format: 'percent' },
    { key: 'curve', label: 'Curve', type: 'select', options: DRAW_EASES },
  ],

  'neon': [
    { key: 'settle', label: 'Settle At', type: 'range', min: 0.05, max: 0.9, step: 0.01, format: 'percent', hint: 'When the tube stops struggling' },
    { key: 'instability', label: 'Instability', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'rate', label: 'Flicker Rate', type: 'range', min: 4, max: 80, step: 2 },
    { key: 'dimLevel', label: 'Dim Level', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'breathe', label: 'Breathe', type: 'range', min: 0, max: 0.4, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color' },
    { key: 'offStart', label: 'Cut Out From', type: 'range', min: 0.5, max: 1, step: 0.01, format: 'percent' },
  ],

  'zoom-streak': [
    { key: 'fromScale', label: 'Start Scale', type: 'range', min: 0.2, max: 4, step: 0.05, unit: '×' },
    { key: 'toScale', label: 'Exit Scale', type: 'range', min: 0.2, max: 3, step: 0.05, unit: '×' },
    { key: 'distance', label: 'Streak Length', type: 'range', min: 0, max: 1.2, step: 0.01 },
    { key: 'samples', label: 'Streak Samples', type: 'range', min: 2, max: 30, step: 1, hint: 'More is smoother but slower' },
    { key: 'strength', label: 'Streak Strength', type: 'range', min: 0, max: 1.5, step: 0.05 },
    { key: 'fromRotate', label: 'Start Rotation', type: 'range', min: -180, max: 180, step: 5, unit: '°' },
    { key: 'inEnd', label: 'Arrive By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'outStart', label: 'Exit From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'curve', label: 'Curve', type: 'select', options: DRAW_EASES },
  ],

  'wave': [
    {
      key: 'axis', label: 'Wave Axis', type: 'segmented', options: [
        { value: 'horizontal', label: 'Horizontal' },
        { value: 'vertical', label: 'Vertical' },
        { value: 'radial', label: 'Radial' },
      ]
    },
    { key: 'amplitude', label: 'Amplitude', type: 'range', min: 0, max: 60, step: 0.5, unit: 'px' },
    { key: 'frequency', label: 'Frequency', type: 'range', min: 0.25, max: 8, step: 0.25, hint: 'Waves across the logo' },
    { key: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 5, step: 0.25, unit: '×' },
    { key: 'crossAmplitude', label: 'Cross Amplitude', type: 'range', min: 0, max: 40, step: 0.5, unit: 'px', hint: 'A second wave on the other axis — reads as cloth' },
    { key: 'crossFrequency', label: 'Cross Frequency', type: 'range', min: 0.25, max: 6, step: 0.25 },
    { key: 'slices', label: 'Resolution', type: 'range', min: 8, max: 120, step: 4, hint: 'More slices are smoother but slower' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.3, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'liquid': [
    { key: 'wobble', label: 'Wobble', type: 'range', min: 0, max: 0.5, step: 0.01, hint: 'Volume-preserving squash and stretch' },
    { key: 'shear', label: 'Shear', type: 'range', min: 0, max: 30, step: 0.5, unit: '°' },
    { key: 'sway', label: 'Sway', type: 'range', min: 0, max: 20, step: 0.5, unit: '°' },
    { key: 'ripple', label: 'Ripple', type: 'range', min: 0, max: 30, step: 0.5, unit: 'px' },
    { key: 'rippleFrequency', label: 'Ripple Frequency', type: 'range', min: 0.5, max: 8, step: 0.25, showIf: { ripple: 'nonzero' } },
    { key: 'slices', label: 'Resolution', type: 'range', min: 8, max: 120, step: 4, showIf: { ripple: 'nonzero' } },
    { key: 'speed', label: 'Speed', type: 'range', min: 0.25, max: 4, step: 0.25, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'glass-shine': [
    { key: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'width', label: 'Band Width', type: 'range', min: 0.02, max: 0.8, step: 0.01, format: 'percent' },
    { key: 'angle', label: 'Angle', type: 'range', min: -90, max: 90, step: 1, unit: '°' },
    { key: 'softness', label: 'Softness', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'dwell', label: 'Dwell', type: 'range', min: 0, max: 0.9, step: 0.01, format: 'percent', hint: 'Pause between passes so it reads as an event' },
    { key: 'cycles', label: 'Passes', type: 'range', min: 1, max: 5, step: 1 },
    { key: 'color', label: 'Light Colour', type: 'color' },
    { key: 'tilt', label: 'Tilt', type: 'range', min: 0, max: 20, step: 0.5, unit: '°' },
    { key: 'scaleAmp', label: 'Scale Sway', type: 'range', min: 0, max: 0.2, step: 0.01, unit: '×' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'glitch': [
    { key: 'amplitude', label: 'Displacement', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
    { key: 'slices', label: 'Slices', type: 'range', min: 3, max: 40, step: 1 },
    { key: 'chroma', label: 'Chromatic Fringe', type: 'range', min: 0, max: 20, step: 0.5, unit: 'px' },
    { key: 'bursts', label: 'Bursts', type: 'range', min: 1, max: 16, step: 1, hint: 'How many times per loop it can fire' },
    { key: 'burstiness', label: 'Burst Chance', type: 'range', min: 0, max: 1, step: 0.05, format: 'percent' },
    { key: 'flicker', label: 'Flicker', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'snap': [
    { key: 'stiffness', label: 'Stiffness', type: 'range', min: 40, max: 500, step: 10, hint: 'Spring constant — how hard it pulls back' },
    { key: 'damping', label: 'Damping', type: 'range', min: 2, max: 40, step: 0.5, hint: 'Lower bounces more; high enough stops overshoot entirely' },
    { key: 'mass', label: 'Mass', type: 'range', min: 0.2, max: 5, step: 0.1, hint: 'Higher feels heavier and slower' },
    { key: 'fromScale', label: 'Start Scale', type: 'range', min: 0, max: 2, step: 0.01, unit: '×' },
    { key: 'fromY', label: 'Start Offset Y', type: 'range', min: -200, max: 200, step: 2, unit: 'px' },
    { key: 'fromX', label: 'Start Offset X', type: 'range', min: -200, max: 200, step: 2, unit: 'px' },
    { key: 'fromRotate', label: 'Start Rotation', type: 'range', min: -180, max: 180, step: 1, unit: '°' },
    { key: 'squash', label: 'Squash & Stretch', type: 'range', min: 0, max: 1, step: 0.01, hint: 'Driven by spring overshoot' },
    { key: 'inEnd', label: 'Arrive By', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'outStart', label: 'Exit From', type: 'range', min: 0.1, max: 1, step: 0.01, format: 'percent' },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'depth': [
    { key: 'yaw', label: 'Yaw', type: 'range', min: 0, max: 80, step: 1, unit: '°', hint: 'Turn around the vertical axis' },
    { key: 'pitch', label: 'Pitch', type: 'range', min: 0, max: 60, step: 1, unit: '°' },
    { key: 'roll', label: 'Roll', type: 'range', min: 0, max: 30, step: 0.5, unit: '°' },
    { key: 'shear', label: 'Perspective', type: 'range', min: 0, max: 0.6, step: 0.01 },
    { key: 'shade', label: 'Shading', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent', hint: 'Dim the face as it turns away' },
    { key: 'cycles', label: 'Cycles', type: 'range', min: 0.5, max: 4, step: 0.5 },
    { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'glowColor', label: 'Glow Colour', type: 'color', showIf: { glow: 'nonzero' } },
  ],

  'particles': [
    { key: 'count', label: 'Particle Count', type: 'range', min: 1, max: 80, step: 1 },
    { key: 'spread', label: 'Spread', type: 'range', min: 20, max: 320, step: 5, unit: 'px' },
    { key: 'size', label: 'Particle Size', type: 'range', min: 0.5, max: 12, step: 0.5, unit: 'px' },
    { key: 'life', label: 'Lifetime', type: 'range', min: 0.1, max: 1, step: 0.05, format: 'percent' },
    { key: 'rise', label: 'Drift Up', type: 'range', min: -120, max: 120, step: 2, unit: 'px' },
    { key: 'color', label: 'Particle Colour', type: 'color' },
    { key: 'glow', label: 'Particle Glow', type: 'range', min: 0, max: 30, step: 1, unit: 'px' },
    { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, format: 'percent' },
    { key: 'layer', label: 'Draw Above Logo', type: 'segmented', options: [
      { value: 'below', label: 'Behind' },
      { value: 'above', label: 'In front' },
    ] },
    { key: 'logoGlow', label: 'Logo Glow', type: 'range', min: 0, max: 40, step: 1, unit: 'px' },
    { key: 'scaleAmp', label: 'Logo Pulse', type: 'range', min: 0, max: 0.3, step: 0.01, unit: '×' },
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

  // ─── ORBIT & RINGS ──────────────────────────────────────────────
  p('orbit-satellite', 'Satellite', 'orbit', 'orbit', 2800, 'linear', {
    count: 1, radius: 150, dotSize: 7, turns: 1, trail: 4, squash: 1,
    color: '#8b5cf6', glow: 12, opacity: 0.95, layer: 'below', logoTurns: 0, scaleAmp: 0.02,
  }, 'Signature'),

  p('orbit-trio', 'Triad', 'orbit', 'orbit', 2400, 'linear', {
    count: 3, radius: 140, dotSize: 6, turns: 1, trail: 2, squash: 1,
    color: '#22d3ee', glow: 10, opacity: 0.9, layer: 'below', logoTurns: 0, scaleAmp: 0,
  }, 'Popular'),

  p('orbit-electron', 'Electron', 'orbit', 'orbit', 2000, 'linear', {
    count: 2, radius: 160, dotSize: 5, turns: 2, trail: 8, squash: 0.35,
    color: '#f472b6', glow: 16, opacity: 1, layer: 'above', logoTurns: 0, scaleAmp: 0.03,
  }, 'New'),

  p('orbit-swarm', 'Swarm', 'orbit', 'orbit', 3200, 'linear', {
    count: 8, radius: 170, dotSize: 4, turns: 1, trail: 3, squash: 0.8,
    color: '#a78bfa', glow: 8, opacity: 0.75, layer: 'below', logoTurns: 0, scaleAmp: 0,
  }),

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

  // ─── SIGNATURE FX ───────────────────────────────────────────────
  p('fx-glass-sweep', 'Glass Sweep', 'fx', 'glass-shine', 3400, 'linear', {
    intensity: 0.8, width: 0.16, angle: 24, softness: 1, dwell: 0.45,
    cycles: 1, color: '#ffffff', tilt: 0, scaleAmp: 0, glow: 0,
  }, 'Signature'),

  p('fx-frosted', 'Frosted Pane', 'fx', 'glass-shine', 4200, 'linear', {
    intensity: 0.5, width: 0.42, angle: 12, softness: 1, dwell: 0.2,
    cycles: 1, color: '#dbeafe', tilt: 2, scaleAmp: 0.015, glow: 10, glowColor: '#93c5fd',
  }, 'New'),

  p('fx-prism', 'Prism Pass', 'fx', 'glass-shine', 2600, 'linear', {
    intensity: 1, width: 0.07, angle: 38, softness: 0.4, dwell: 0.3,
    cycles: 2, color: '#f0abfc', tilt: 0, scaleAmp: 0, glow: 14, glowColor: '#c084fc',
  }),

  p('fx-liquid', 'Liquid Morph', 'fx', 'liquid', 3600, 'linear', {
    wobble: 0.09, shear: 4, sway: 2, ripple: 0, speed: 1, glow: 0,
  }, 'Signature'),

  p('fx-blob', 'Blob', 'fx', 'liquid', 4400, 'linear', {
    wobble: 0.2, shear: 10, sway: 5, ripple: 0, speed: 1, glow: 0,
  }, 'Popular'),

  p('fx-molten', 'Molten', 'fx', 'liquid', 5000, 'linear', {
    wobble: 0.12, shear: 6, sway: 3, ripple: 9, rippleFrequency: 3, slices: 56,
    speed: 0.75, glow: 22, glowColor: '#fb923c',
  }, 'New'),

  p('fx-wave', 'Silk Wave', 'fx', 'wave', 3600, 'linear', {
    axis: 'horizontal', amplitude: 9, frequency: 2, speed: 1,
    crossAmplitude: 0, crossFrequency: 1.5, slices: 64, scaleAmp: 0, glow: 0,
  }, 'Signature'),

  p('fx-flag', 'Flag', 'fx', 'wave', 3000, 'linear', {
    axis: 'vertical', amplitude: 14, frequency: 1.5, speed: 1.5,
    crossAmplitude: 6, crossFrequency: 2.5, slices: 72, scaleAmp: 0, glow: 0,
  }, 'Popular'),

  p('fx-ripple', 'Water Ripple', 'fx', 'wave', 4000, 'linear', {
    axis: 'radial', amplitude: 12, frequency: 3, speed: 1,
    crossAmplitude: 0, crossFrequency: 1, slices: 80, scaleAmp: 0.02,
    glow: 12, glowColor: '#38bdf8',
  }, 'New'),

  p('fx-heat', 'Heat Haze', 'fx', 'wave', 2400, 'linear', {
    axis: 'horizontal', amplitude: 4, frequency: 6, speed: 2.5,
    crossAmplitude: 2, crossFrequency: 4, slices: 96, scaleAmp: 0, glow: 0,
  }),

  p('fx-glitch', 'Glitch', 'fx', 'glitch', 2200, 'linear', {
    amplitude: 16, slices: 14, chroma: 5, bursts: 5, burstiness: 0.55,
    flicker: 0.8, glow: 0,
  }, 'Popular'),

  p('fx-datamosh', 'Datamosh', 'fx', 'glitch', 1800, 'linear', {
    amplitude: 38, slices: 26, chroma: 12, bursts: 8, burstiness: 0.7,
    flicker: 0.55, glow: 8, glowColor: '#22d3ee',
  }, 'New'),

  p('fx-signal', 'Weak Signal', 'fx', 'glitch', 3200, 'linear', {
    amplitude: 7, slices: 30, chroma: 2, bursts: 12, burstiness: 0.3,
    flicker: 0.9, glow: 0,
  }),

  p('fx-snap', 'Elastic Snap', 'fx', 'snap', 2600, 'linear', {
    stiffness: 240, damping: 10, mass: 1, fromScale: 0.35, fromY: 0, fromX: 0,
    fromRotate: 0, squash: 0.35, inEnd: 0.6, outStart: 0.88, fadeInEnd: 0.12, glow: 0,
  }, 'Signature'),

  p('fx-snap-drop', 'Spring Drop', 'fx', 'snap', 2800, 'linear', {
    stiffness: 180, damping: 8, mass: 1.2, fromScale: 0.9, fromY: -160, fromX: 0,
    fromRotate: 0, squash: 0.5, inEnd: 0.65, outStart: 0.9, fadeInEnd: 0.08, glow: 0,
  }, 'Popular'),

  p('fx-snap-heavy', 'Heavy Landing', 'fx', 'snap', 3000, 'linear', {
    stiffness: 320, damping: 22, mass: 3, fromScale: 1.6, fromY: -60, fromX: 0,
    fromRotate: 0, squash: 0.6, inEnd: 0.55, outStart: 0.9, fadeInEnd: 0.05, glow: 0,
  }),

  p('fx-snap-swing', 'Swing In', 'fx', 'snap', 2800, 'linear', {
    stiffness: 200, damping: 9, mass: 1, fromScale: 0.7, fromY: 0, fromX: -180,
    fromRotate: -35, squash: 0.2, inEnd: 0.62, outStart: 0.9, fadeInEnd: 0.1, glow: 0,
  }, 'New'),

  p('fx-depth', 'Depth Turn', 'fx', 'depth', 3600, 'linear', {
    yaw: 34, pitch: 10, roll: 0, shear: 0.15, shade: 0.45, cycles: 1, glow: 0,
  }, 'Signature'),

  p('fx-coin', 'Coin Flip', 'fx', 'depth', 2400, 'linear', {
    yaw: 80, pitch: 0, roll: 0, shear: 0, shade: 0.7, cycles: 1, glow: 0,
  }, 'Popular'),

  p('fx-hover-card', 'Hover Card', 'fx', 'depth', 4400, 'linear', {
    yaw: 14, pitch: 8, roll: 3, shear: 0.25, shade: 0.2, cycles: 1,
    glow: 16, glowColor: '#8b5cf6',
  }, 'New'),

  p('fx-sparks', 'Sparks', 'fx', 'particles', 3000, 'linear', {
    count: 28, spread: 160, size: 3, life: 0.55, rise: 50, color: '#fcd34d',
    glow: 8, opacity: 0.95, layer: 'above', logoGlow: 10, scaleAmp: 0.02,
  }, 'Signature'),

  p('fx-embers', 'Embers', 'fx', 'particles', 4600, 'linear', {
    count: 44, spread: 200, size: 2.5, life: 0.8, rise: 110, color: '#fb7185',
    glow: 12, opacity: 0.8, layer: 'below', logoGlow: 16, scaleAmp: 0.015,
  }, 'Popular'),

  p('fx-stardust', 'Stardust', 'fx', 'particles', 5200, 'linear', {
    count: 60, spread: 240, size: 1.5, life: 0.9, rise: -30, color: '#e0e7ff',
    glow: 6, opacity: 0.7, layer: 'above', logoGlow: 0, scaleAmp: 0,
  }, 'New'),

  p('fx-burst', 'Burst', 'fx', 'particles', 1800, 'linear', {
    count: 36, spread: 280, size: 4, life: 0.4, rise: 0, color: '#22d3ee',
    glow: 14, opacity: 1, layer: 'above', logoGlow: 20, scaleAmp: 0.06,
  }),

  // ─── PATH DRAWING · trim-path variants ──────────────────────────
  p('trace-trim-loop', 'Trim Loop', 'path', 'path-draw', 2800, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 1, drawEase: 'linear',
    trimStart: 0, trimEnd: 0.3, trimSpin: 1,
    strokeScale: 1.6, glow: 16, glowLayers: 3, colorMode: 'custom', color: '#22d3ee',
    revealLogo: true, logoFadeStart: 0.05, logoFadeEnd: 0.25, holdEnd: 1, fadeEnd: 1, opacity: 1,
  }, 'New'),

  p('trace-trim-pinch', 'Pinch Trim', 'path', 'path-draw', 3200, 'linear', {
    mode: 'trace', drawStart: 0.02, drawEnd: 0.6, drawEase: 'easeInOut',
    trimStart: 0.15, trimEnd: 0.85, trimOffset: 0,
    strokeScale: 1.2, glow: 8, glowLayers: 2, colorMode: 'source',
    revealLogo: true, logoFadeStart: 0.55, logoFadeEnd: 0.75, holdEnd: 0.88, fadeEnd: 0.97, opacity: 1,
  }),

  p('trace-bloom', 'Neon Bloom', 'path', 'path-draw', 3000, 'linear', {
    mode: 'trace', drawStart: 0, drawEnd: 0.52, drawEase: 'expoOut',
    strokeScale: 1.3, glow: 26, glowLayers: 4, glowColor: '#f0abfc',
    colorMode: 'custom', color: '#e879f9',
    revealLogo: true, logoFadeStart: 0.5, logoFadeEnd: 0.7, holdEnd: 0.86, fadeEnd: 0.97, opacity: 1,
  }, 'Popular'),

  p('trace-halo-line', 'Halo Line', 'path', 'path-draw', 3400, 'linear', {
    mode: 'comet', drawStart: 0, drawEnd: 1, drawEase: 'linear', tailLength: 0.3,
    strokeScale: 1, glow: 20, glowLayers: 3, colorMode: 'custom', color: '#4ade80',
    revealLogo: true, logoFadeStart: 0.1, logoFadeEnd: 0.3, holdEnd: 1, fadeEnd: 1, opacity: 0.9,
  }, 'New'),

  // ─── INK & HANDWRITING ──────────────────────────────────────────
  p('ink-signature', 'Signature', 'ink', 'handwrite', 4000, 'linear', {
    writeStart: 0.02, writeEnd: 0.72, strokeGap: 0.14, nibSize: 3.5, nibColor: '#ffffff',
    pressure: 0.45, strokeScale: 1.3, colorMode: 'source', glow: 0,
    revealLogo: true, logoFadeStart: 0.74, logoFadeEnd: 0.88, holdEnd: 0.94, fadeEnd: 1,
  }, 'Signature'),

  p('ink-fountain', 'Fountain Pen', 'ink', 'handwrite', 4600, 'linear', {
    writeStart: 0, writeEnd: 0.78, strokeGap: 0.2, nibSize: 5, nibColor: '#e2e8f0',
    pressure: 0.9, strokeScale: 1.6, colorMode: 'custom', color: '#0f172a', glow: 0,
    revealLogo: false, holdEnd: 0.94, fadeEnd: 1,
  }, 'Popular'),

  p('ink-marker', 'Marker', 'ink', 'handwrite', 3200, 'linear', {
    writeStart: 0, writeEnd: 0.66, strokeGap: 0.06, nibSize: 6, nibColor: '#f472b6',
    pressure: 0.1, strokeScale: 3.2, colorMode: 'custom', color: '#f472b6', lineCap: 'square',
    glow: 0, revealLogo: true, logoFadeStart: 0.68, logoFadeEnd: 0.84, holdEnd: 0.94, fadeEnd: 1,
  }, 'Popular'),

  p('ink-neon-write', 'Neon Script', 'ink', 'handwrite', 3800, 'linear', {
    writeStart: 0, writeEnd: 0.7, strokeGap: 0.1, nibSize: 4, nibColor: '#ffffff',
    pressure: 0.3, strokeScale: 1.4, colorMode: 'custom', color: '#22d3ee',
    glow: 20, glowLayers: 4, glowColor: '#67e8f9',
    revealLogo: true, logoFadeStart: 0.72, logoFadeEnd: 0.86, holdEnd: 0.94, fadeEnd: 1,
  }, 'Signature'),

  p('ink-calligraphy', 'Calligraphy', 'ink', 'handwrite', 5200, 'linear', {
    writeStart: 0.02, writeEnd: 0.8, strokeGap: 0.26, nibSize: 2.5, nibColor: '#fcd34d',
    pressure: 1.3, strokeScale: 1.1, colorMode: 'custom', color: '#d4af37', glow: 4,
    revealLogo: true, logoFadeStart: 0.82, logoFadeEnd: 0.93, holdEnd: 0.96, fadeEnd: 1,
  }, 'New'),

  p('ink-sketch', 'Quick Sketch', 'ink', 'handwrite', 2400, 'linear', {
    writeStart: 0, writeEnd: 0.58, strokeGap: 0.03, nibSize: 2, nibColor: '#94a3b8',
    pressure: 0.2, strokeScale: 0.8, colorMode: 'source', glow: 0,
    revealLogo: true, logoFadeStart: 0.6, logoFadeEnd: 0.76, holdEnd: 0.9, fadeEnd: 1,
  }),

  p('ink-chalk', 'Chalkboard', 'ink', 'handwrite', 4200, 'linear', {
    writeStart: 0, writeEnd: 0.74, strokeGap: 0.16, nibSize: 3, nibColor: '#f8fafc',
    pressure: 0.6, strokeScale: 2.2, colorMode: 'custom', color: '#f1f5f9', lineCap: 'round',
    glow: 3, revealLogo: false, holdEnd: 0.94, fadeEnd: 1,
  }),

  p('ink-blueprint-draw', 'Drafting', 'ink', 'handwrite', 5000, 'linear', {
    writeStart: 0, writeEnd: 0.82, strokeGap: 0.22, nibSize: 2.5, nibColor: '#bfdbfe',
    pressure: 0, strokeScale: 0.7, colorMode: 'custom', color: '#60a5fa', lineCap: 'butt',
    glow: 5, revealLogo: true, logoFadeStart: 0.84, logoFadeEnd: 0.94, holdEnd: 0.97, fadeEnd: 1,
  }, 'New'),

  p('ink-gold-leaf', 'Gold Leaf', 'ink', 'handwrite', 4400, 'linear', {
    writeStart: 0.02, writeEnd: 0.72, strokeGap: 0.18, nibSize: 4, nibColor: '#fef3c7',
    pressure: 0.8, strokeScale: 1.5, colorMode: 'custom', color: '#d4af37',
    glow: 14, glowLayers: 3, glowColor: '#fcd34d',
    revealLogo: true, logoFadeStart: 0.76, logoFadeEnd: 0.9, holdEnd: 0.95, fadeEnd: 1,
  }, 'Popular'),

  p('ink-fast-write', 'Rapid Hand', 'ink', 'handwrite', 1800, 'linear', {
    writeStart: 0, writeEnd: 0.52, strokeGap: 0.02, nibSize: 3, nibColor: '#a78bfa',
    pressure: 0.35, strokeScale: 1.2, colorMode: 'source', glow: 6,
    revealLogo: true, logoFadeStart: 0.54, logoFadeEnd: 0.7, holdEnd: 0.9, fadeEnd: 1,
  }),

  // ─── REVEAL & ASSEMBLE ──────────────────────────────────────────
  p('rev-assemble', 'Assemble', 'reveal', 'shatter', 2800, 'linear', {
    mode: 'assemble', columns: 8, rows: 8, distance: 90, spin: 40, stagger: 0.5,
    origin: 'random', fade: 1, curve: 'expoOut', start: 0, end: 0.6, exitStart: 0.92,
  }, 'Signature'),

  p('rev-implode', 'Implode', 'reveal', 'shatter', 2600, 'linear', {
    mode: 'assemble', columns: 12, rows: 12, distance: 200, spin: 90, stagger: 0.7,
    origin: 'radial', fade: 1, curve: 'expoOut', start: 0, end: 0.55, exitStart: 0.9,
  }, 'Popular'),

  p('rev-shatter', 'Shatter Out', 'reveal', 'shatter', 2400, 'linear', {
    mode: 'scatter', columns: 10, rows: 10, distance: 240, spin: 140, stagger: 0.4,
    origin: 'radial', fade: 1, curve: 'easeIn', start: 0.35, end: 1, exitStart: 1,
  }, 'New'),

  p('rev-mosaic', 'Mosaic', 'reveal', 'shatter', 3400, 'linear', {
    mode: 'assemble', columns: 18, rows: 18, distance: 40, spin: 0, stagger: 0.9,
    origin: 'random', fade: 1, curve: 'easeOut', start: 0, end: 0.68, exitStart: 0.94,
  }),

  p('rev-pixel', 'Pixel Focus', 'reveal', 'pixelate', 2600, 'linear', {
    minBlocks: 4, maxBlocks: 140, steps: 7, start: 0.04, end: 0.58,
    exitStart: 0.9, curve: 'expoOut', fadeInEnd: 0.1, fadeOut: 0.6,
  }, 'Signature'),

  p('rev-8bit', '8-Bit', 'reveal', 'pixelate', 3000, 'linear', {
    minBlocks: 8, maxBlocks: 44, steps: 4, start: 0, end: 0.6,
    exitStart: 0.88, curve: 'linear', fadeInEnd: 0.06, fadeOut: 0.8,
  }, 'New'),

  p('rev-bands', 'Band Reveal', 'reveal', 'bands', 2600, 'linear', {
    axis: 'vertical', count: 12, overlap: 0.5, slide: 24, order: 'forward',
    start: 0, end: 0.6, exitStart: 0.9, curve: 'expoOut',
  }, 'Popular'),

  p('rev-blinds', 'Blinds', 'reveal', 'bands', 2400, 'linear', {
    axis: 'horizontal', count: 16, overlap: 0.2, slide: 0, order: 'forward',
    start: 0, end: 0.55, exitStart: 0.9, curve: 'easeOut',
  }),

  p('rev-centre-out', 'Centre Out', 'reveal', 'bands', 2800, 'linear', {
    axis: 'vertical', count: 14, overlap: 0.6, slide: 40, order: 'centre',
    start: 0, end: 0.62, exitStart: 0.92, curve: 'expoOut',
  }, 'New'),

  p('rev-typeon', 'Type On', 'reveal', 'bands', 3000, 'linear', {
    axis: 'vertical', count: 24, overlap: 0.05, slide: 12, order: 'forward',
    start: 0, end: 0.68, exitStart: 0.94, curve: 'linear',
  }, 'Popular'),

  p('rev-neon-on', 'Neon Power-On', 'reveal', 'neon', 3200, 'linear', {
    settle: 0.42, instability: 0.75, rate: 34, dimLevel: 0.12, breathe: 0.05,
    glow: 26, glowColor: '#22d3ee', offStart: 0.94,
  }, 'Signature'),

  p('rev-neon-sign', 'Broken Sign', 'reveal', 'neon', 4000, 'linear', {
    settle: 0.85, instability: 0.9, rate: 60, dimLevel: 0.05, breathe: 0.12,
    glow: 34, glowColor: '#f472b6', offStart: 0.98,
  }, 'New'),

  // ─── FILL & COLOUR ──────────────────────────────────────────────
  p('fill-liquid', 'Liquid Fill', 'fill', 'liquid-fill', 3600, 'linear', {
    color: '#8b5cf6', fillStart: 0.05, fillEnd: 0.7, waveHeight: 5, waveCount: 2,
    waveSpeed: 1.5, ghost: 0.18, drain: 1, drainStart: 0.88, curve: 'easeInOut',
    glow: 0, scaleAmp: 0,
  }, 'Signature'),

  p('fill-ocean', 'Ocean', 'fill', 'liquid-fill', 4600, 'linear', {
    color: '#0ea5e9', fillStart: 0, fillEnd: 0.75, waveHeight: 11, waveCount: 3,
    waveSpeed: 2.5, ghost: 0.25, drain: 0, curve: 'easeOut', glow: 16, scaleAmp: 0.01,
  }, 'Popular'),

  p('fill-lava', 'Lava', 'fill', 'liquid-fill', 5200, 'linear', {
    color: '#f97316', fillStart: 0.05, fillEnd: 0.8, waveHeight: 7, waveCount: 1.5,
    waveSpeed: 0.75, ghost: 0.3, drain: 0, curve: 'easeInOut', glow: 28, scaleAmp: 0.015,
  }, 'New'),

  p('fill-battery', 'Charging', 'fill', 'liquid-fill', 3000, 'linear', {
    color: '#4ade80', fillStart: 0, fillEnd: 0.85, waveHeight: 2, waveCount: 4,
    waveSpeed: 3, ghost: 0.12, drain: 1, drainStart: 0.92, curve: 'linear',
    glow: 12, scaleAmp: 0,
  }, 'Popular'),

  p('fill-gradient', 'Gradient Flow', 'fill', 'gradient-sweep', 3400, 'linear', {
    colorA: '#8b5cf6', colorB: '#22d3ee', colorC: '#f472b6',
    angle: 30, cycles: 1, intensity: 1, scaleAmp: 0, glow: 0,
  }, 'Signature'),

  p('fill-aurora', 'Aurora', 'fill', 'gradient-sweep', 5000, 'linear', {
    colorA: '#4ade80', colorB: '#22d3ee', colorC: '#a78bfa',
    angle: 62, cycles: 1, intensity: 0.95, scaleAmp: 0.015, glow: 18,
  }, 'Popular'),

  p('fill-sunset', 'Sunset', 'fill', 'gradient-sweep', 4200, 'linear', {
    colorA: '#fb7185', colorB: '#fb923c', colorC: '#fcd34d',
    angle: 0, cycles: 1, intensity: 1, scaleAmp: 0, glow: 12,
  }, 'New'),

  p('fill-holo', 'Holographic', 'fill', 'gradient-sweep', 2600, 'linear', {
    colorA: '#f0abfc', colorB: '#67e8f9', colorC: '#fde047',
    angle: 45, cycles: 2, intensity: 1, scaleAmp: 0.02, glow: 20,
  }, 'Popular'),

  p('fill-shimmer', 'Shimmer', 'fill', 'shimmer', 2800, 'linear', {
    intensity: 0.55, width: 0.22, angle: 20, color: '#ffffff', scaleAmp: 0, glow: 0,
  }),

  p('fill-chrome', 'Chrome Sweep', 'fill', 'shimmer', 2200, 'linear', {
    intensity: 0.85, width: 0.14, angle: 30, color: '#e0f2fe', scaleAmp: 0.02, glow: 8,
  }),

  p('fill-scan', 'Scanline', 'fill', 'shimmer', 2000, 'linear', {
    intensity: 0.6, width: 0.04, angle: 0, color: '#4ade80', scaleAmp: 0, glow: 6,
  }),

  p('fill-wipe', 'Light Wipe', 'fill', 'wipe', 3000, 'linear', {
    direction: 'left', revealEnd: 0.45, hideStart: 0.82, sweepLight: 0.7,
    sweepWidth: 0.16, sweepColor: '#ffffff',
  }),

  p('fill-wipe-up', 'Rise Wipe', 'fill', 'wipe', 3000, 'linear', {
    direction: 'up', revealEnd: 0.5, hideStart: 0.85, sweepLight: 0.5,
    sweepWidth: 0.2, sweepColor: '#a78bfa',
  }),

  p('fill-dissolve', 'Blur Dissolve', 'fill', 'dissolve', 3000, 'ease-in-out', {
    blurMax: 12, opacityMin: 0.15, scaleAt: 1.1,
  }),

  // ─── ENTRANCE · zoom streaks ────────────────────────────────────
  p('pop-zoom-streak', 'Zoom Streak', 'entrance', 'zoom-streak', 2200, 'linear', {
    fromScale: 1.8, toScale: 0.7, distance: 0.4, samples: 14, strength: 0.75,
    fromRotate: 0, inEnd: 0.45, outStart: 0.85, fadeInEnd: 0.12, curve: 'expoOut',
  }, 'Signature'),

  p('pop-warp-in', 'Warp In', 'entrance', 'zoom-streak', 2000, 'linear', {
    fromScale: 0.25, toScale: 2.4, distance: 0.6, samples: 18, strength: 0.9,
    fromRotate: -40, inEnd: 0.5, outStart: 0.82, fadeInEnd: 0.08, curve: 'expoOut',
  }, 'Popular'),

  p('pop-hyperspace', 'Hyperspace', 'entrance', 'zoom-streak', 1600, 'linear', {
    fromScale: 3.2, toScale: 0.4, distance: 0.9, samples: 22, strength: 1.1,
    fromRotate: 0, inEnd: 0.4, outStart: 0.8, fadeInEnd: 0.05, curve: 'expoOut',
  }, 'New'),

  // ─── MOTION · jelly, bounce, flips ──────────────────────────────
  p('fx-jelly', 'Jelly', 'fx', 'jelly', 2200, 'linear', {
    squash: 0.18, bounces: 2, damping: 2.4, cycles: 1, lift: 0, tilt: 0, glow: 0,
  }, 'Signature'),

  p('fx-gummy', 'Gummy', 'fx', 'jelly', 3000, 'linear', {
    squash: 0.34, bounces: 3, damping: 1.6, cycles: 1, lift: 18, tilt: 5, glow: 0,
  }, 'Popular'),

  p('fx-wobble-soft', 'Soft Wobble', 'fx', 'jelly', 4000, 'linear', {
    squash: 0.07, bounces: 2, damping: 0.8, cycles: 1, lift: 0, tilt: 2, glow: 0,
  }),

  p('float-bounce', 'Ball Bounce', 'float', 'bounce', 1800, 'linear', {
    height: 70, hops: 2, squash: 0.24, tilt: 0, shadow: 30, shadowColor: '#000000',
  }, 'Signature'),

  p('float-hop', 'Happy Hop', 'float', 'bounce', 2400, 'linear', {
    height: 45, hops: 3, squash: 0.16, tilt: 8, shadow: 22, shadowColor: '#000000',
  }, 'Popular'),

  p('spin-flip3d', 'Card Turn', 'spin', 'flip3d', 2600, 'linear', {
    axis: 'y', turns: 1, perspective: 9, backShade: 0.4, edgeFade: 0.6, lift: 0.06, glow: 0,
  }, 'Signature'),

  p('spin-flip-x', 'Tumble', 'spin', 'flip3d', 3000, 'linear', {
    axis: 'x', turns: 1, perspective: 12, backShade: 0.3, edgeFade: 0.7, lift: 0.1, glow: 0,
  }, 'New'),

  p('spin-coin-3d', 'Spinning Coin', 'spin', 'flip3d', 1800, 'linear', {
    axis: 'y', turns: 2, perspective: 4, backShade: 0.55, edgeFade: 0.4, lift: 0.02,
    glow: 14, glowColor: '#fcd34d',
  }, 'Popular'),

  // ─── REVEAL · iris apertures ────────────────────────────────────
  p('rev-iris', 'Iris Open', 'reveal', 'iris', 2600, 'linear', {
    shape: 'circle', originX: 0, originY: 0, fromScale: 1.1, fromRotate: 0,
    start: 0, end: 0.55, closeStart: 0.88, curve: 'expoOut', glow: 0,
  }, 'Signature'),

  p('rev-shutter', 'Camera Shutter', 'reveal', 'iris', 2400, 'linear', {
    shape: 'blades', blades: 6, spin: 0.5, originX: 0, originY: 0,
    fromScale: 1.05, fromRotate: 0, start: 0, end: 0.5, closeStart: 0.85,
    curve: 'expoOut', glow: 0,
  }, 'Popular'),

  p('rev-diamond', 'Diamond Wipe', 'reveal', 'iris', 2800, 'linear', {
    shape: 'diamond', originX: 0, originY: 0, fromScale: 1, fromRotate: 45,
    start: 0, end: 0.58, closeStart: 0.9, curve: 'circOut', glow: 0,
  }, 'New'),

  p('rev-corner-iris', 'Corner Sweep', 'reveal', 'iris', 3000, 'linear', {
    shape: 'circle', originX: -0.8, originY: -0.8, fromScale: 1, fromRotate: 0,
    start: 0, end: 0.62, closeStart: 0.9, curve: 'easeInOut', glow: 0,
  }),

  // ─── ENTRANCE · confetti celebrations ───────────────────────────
  p('pop-confetti', 'Confetti', 'entrance', 'confetti', 3000, 'linear', {
    count: 44, velocity: 210, gravity: 260, size: 7, spin: 3, life: 0.7,
    burstAt: 0.18, shape: 'rect', colorA: '#8b5cf6', colorB: '#22d3ee',
    colorC: '#fcd34d', colorD: '#f472b6', fromScale: 0.6, opacity: 1,
    outStart: 0.92, glow: 0,
  }, 'Signature'),

  p('pop-celebrate', 'Celebrate', 'entrance', 'confetti', 3600, 'linear', {
    count: 90, velocity: 300, gravity: 340, size: 9, spin: 5, life: 0.8,
    burstAt: 0.12, shape: 'rect', colorA: '#fb7185', colorB: '#4ade80',
    colorC: '#fcd34d', colorD: '#60a5fa', fromScale: 0.4, opacity: 1,
    outStart: 0.95, glow: 0,
  }, 'Popular'),

  p('pop-bubbles', 'Bubbles', 'entrance', 'confetti', 4000, 'linear', {
    count: 36, velocity: 150, gravity: -120, size: 10, spin: 0.5, life: 0.85,
    burstAt: 0.15, shape: 'circle', colorA: '#a78bfa', colorB: '#67e8f9',
    colorC: '#e0e7ff', colorD: '#f0abfc', fromScale: 0.7, opacity: 0.7,
    outStart: 0.95, glow: 12,
  }, 'New'),
];

export const TOTAL_PRESETS = PRESETS.length;

/** Presets bucketed by group id, in GROUPS order. */
export const PRESETS_BY_GROUP = GROUPS.map((g) => ({
  ...g,
  presets: PRESETS.filter((preset) => preset.group === g.id),
}));

export const DEFAULT_PRESET_ID = 'trace-classic';

/**
 * Families that stroke the logo's own geometry. A raster upload has no paths to
 * trace, so these render as the logo's fade envelope alone — the UI marks them
 * unavailable rather than letting them silently do nothing.
 */
export const VECTOR_ONLY_FAMILIES = new Set(['path-draw', 'handwrite']);

export function needsVector(preset) {
  return VECTOR_ONLY_FAMILIES.has(preset.family);
}

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
