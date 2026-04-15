const CoreEngine = require('./core-engine');

/**
 * Deterministically generates a Lottie JSON string directly from the
 * stateless core animation engine by stepping through frame intervals.
 *
 * @param {object} animation Config from ANIMATIONS
 * @param {string} svgBase64 The base64 data URI of the logo SVG
 * @param {Array} svgPathsData Path measurements for path-draw
 * @param {number} fps Target frames per second
 * @returns {string} Fully valid Lottie JSON
 */
function generateLottieJson(animation, svgBase64, svgPathsData = [], fps = 60) {
  const durationMs = animation.duration;
  const totalFrames = Math.round((durationMs / 1000) * fps);

  // We'll calculate the keys by looping from 0 to totalFrames
  const positionKeys = [];
  const scaleKeys = [];
  const rotationKeys = [];
  const opacityKeys = [];
  
  const particlePositionKeys = [[], [], [], [], [], []];
  const particleScaleKeys = [[], [], [], [], [], []];
  const particleOpacityKeys = [[], [], [], [], [], []];

  // We are working with 440x440 logic size, scale is based on 220 target.
  const canvasLayoutW = 440;
  const canvasLayoutH = 440;
  const baseScale = 440 / 440; // 1
  const targetSize = 220;
  // If the user svg has height w/h they are normalized to 220, 220. Image layer original size is 220x220.
  const imgW = 220; 
  const imgH = 220;
  const fitScale = targetSize / Math.max(imgW, imgH); // 1
  
  for (let f = 0; f <= totalFrames; f++) {
    // Exact progress strictly for this frame tick
    const progress = f / totalFrames;
    const state = CoreEngine.getFrameState(progress, animation, svgPathsData);
    
    // Core transforms
    const tx = state.logo.tx * baseScale;
    const ty = state.logo.ty * baseScale;
    
    // Position array in Lottie: [x, y, z]
    // Anchor point for logo is [110, 110, 0]. It is placed at [220, 220] on canvas.
    // Lottie center:
    positionKeys.push({
      t: f,
      s: [ (canvasLayoutW / 2) + tx, (canvasLayoutH / 2) + ty, 0 ],
      h: 1 // hold frame (no bezier easing needed since we perfectly sample every frame)
    });
    
    // Scale array in Lottie: [x%, y%, z%]
    const s = state.logo.scale * baseScale * fitScale * 100;
    scaleKeys.push({
      t: f,
      s: [ s, s, 100 ],
      h: 1
    });
    
    // Rotation: [degrees]
    rotationKeys.push({
      t: f,
      s: [ state.logo.rotate ],
      h: 1
    });
    
    // Opacity: [0-100]
    opacityKeys.push({
      t: f,
      s: [ Math.max(0, state.logo.opacity) * 100 ],
      h: 1
    });
    
    // Particles (up to 6)
    for (let i = 0; i < 6; i++) {
        if (state.particles && state.particles[i]) {
            const p = state.particles[i];
            particlePositionKeys[i].push({
                t: f,
                s: [ (canvasLayoutW / 2) + p.x * baseScale, (canvasLayoutH / 2) + p.y * baseScale, 0 ],
                h: 1
            });
            const pS = p.scale * baseScale * 100;
            particleScaleKeys[i].push({ t: f, s: [pS, pS, 100], h: 1 });
            particleOpacityKeys[i].push({ t: f, s: [p.alpha * 100], h: 1 });
        } else {
            // invisible frame
            particlePositionKeys[i].push({ t: f, s: [ canvasLayoutW/2, canvasLayoutH/2, 0 ], h: 1 });
            particleScaleKeys[i].push({ t: f, s: [ 0, 0, 100 ], h: 1 });
            particleOpacityKeys[i].push({ t: f, s: [ 0 ], h: 1 });
        }
    }
  }

  const layers = [
    {
      ddd: 0,
      ind: 10,
      ty: 2, // Image layer
      nm: "Logo Base Image",
      refId: "image_0",
      sr: 1,
      ks: {
        o: { a: 1, k: opacityKeys },
        r: { a: 1, k: rotationKeys },
        p: { a: 1, k: positionKeys },
        a: { a: 0, k: [imgW / 2, imgH / 2, 0] },
        s: { a: 1, k: scaleKeys }
      },
      ao: 0,
      ip: 0,
      op: totalFrames,
      st: 0,
      bm: 0
    }
  ];
  
  // Conditionally add particle layers if animation is particle-burst
  if (animation.family === 'particle-burst') {
      for(let i=0; i<6; i++) {
          layers.push({
              ddd: 0,
              ind: i + 1,
              ty: 4, // Shape layer
              nm: `Particle ${i+1}`,
              sr: 1,
              ks: {
                  o: { a: 1, k: particleOpacityKeys[i] },
                  r: { a: 0, k: 0 },
                  p: { a: 1, k: particlePositionKeys[i] },
                  a: { a: 0, k: [0, 0, 0] },
                  s: { a: 1, k: particleScaleKeys[i] }
              },
              shapes: [
                {
                    ty: "el", // Ellipse
                    d: 1,
                    p: { a: 0, k: [0, 0] }, // pos offset
                    s: { a: 0, k: [6, 6] }, // size (3px radius = 6 diameter)
                    nm: "Ellipse Path 1",
                    hd: false
                },
                {
                    ty: "fl", // Fill
                    c: { a: 0, k: [145/255, 246/255, 255/255, 1] }, // #91f6ff matching particles
                    o: { a: 0, k: 100 },
                    nm: "Fill 1",
                    hd: false
                }
              ],
              ao: 0,
              ip: 0,
              op: totalFrames,
              st: 0,
              bm: 0
          });
      }
  }

  const lottieData = {
    v: "5.5.2",
    fr: fps,
    ip: 0,
    op: totalFrames,
    w: canvasLayoutW,
    h: canvasLayoutH,
    nm: "Logo Loader - " + animation.name,
    ddd: 0,
    assets: [
      {
        id: "image_0",
        w: imgW,
        h: imgH,
        u: "",
        p: svgBase64,
        e: 1
      }
    ],
    layers: layers
  };
  
  if (animation.backgroundColor) {
      layers.push({
          ddd: 0, ind: 99, ty: 1, nm: "Background",
          sw: canvasLayoutW, sh: canvasLayoutH, sc: animation.backgroundColor,
          ks: {
              o: { a: 0, k: 100 },
              r: { a: 0, k: 0 },
              p: { a: 0, k: [canvasLayoutW/2, canvasLayoutH/2, 0] },
              a: { a: 0, k: [canvasLayoutW/2, canvasLayoutH/2, 0] },
              s: { a: 0, k: [100, 100, 100] }
          },
          ip: 0, op: totalFrames, st: 0, bm: 0
      });
  }

  return JSON.stringify(lottieData, null, 2); // beautified json
}

module.exports = { generateLottieJson };
