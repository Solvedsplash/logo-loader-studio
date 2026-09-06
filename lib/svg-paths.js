/**
 * SVG shape → path extraction.
 * ─────────────────────────────────────────────────────────────────
 * Like core-engine.js, this is dependency-free UMD ES5 because it runs both as
 * a normal import in the browser and injected as source text into Puppeteer.
 * Keeping one copy is what guarantees the preview and the server export measure
 * the same paths, with the same lengths and the same colours.
 *
 * Each extracted path carries a matrix mapping its own local user units into the
 * SVG's viewport pixels. That matrix is what makes <g transform="...">, nested
 * transforms and a viewBox whose scale differs from the width/height attributes
 * all trace in the right place at the right size — without it, a logo authored
 * with viewBox="0 0 100 100" width="384" traced at 26% scale in the corner.
 */

(function (global) {
  'use strict';

  var FALLBACK_COLOR = '#8b5cf6';
  var IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

  function n(node, attr, dflt) {
    var v = node.getAttribute(attr);
    if (v === null || v === '') return dflt === undefined ? 0 : dflt;
    var f = parseFloat(v);
    return isNaN(f) ? (dflt === undefined ? 0 : dflt) : f;
  }

  /**
   * Converts any primitive SVG shape into equivalent path `d` data, in the
   * shape's own local coordinates.
   */
  function shapeToPathD(node) {
    var tag = node.tagName.toLowerCase();

    if (tag === 'path') return node.getAttribute('d') || '';

    if (tag === 'rect') {
      var x = n(node, 'x'), y = n(node, 'y');
      var w = n(node, 'width'), h = n(node, 'height');
      if (!(w > 0) || !(h > 0)) return '';

      // Rounded corners. Per spec an absent rx inherits ry (and vice versa), and
      // each radius clamps to half the corresponding side. Dropping these — as
      // this function used to — turns every rounded frame into a sharp rectangle,
      // which is exactly the "square outline on a curved logo" symptom.
      var rxAttr = node.getAttribute('rx');
      var ryAttr = node.getAttribute('ry');
      var rx = rxAttr === null || rxAttr === '' ? NaN : parseFloat(rxAttr);
      var ry = ryAttr === null || ryAttr === '' ? NaN : parseFloat(ryAttr);
      if (isNaN(rx) && isNaN(ry)) { rx = 0; ry = 0; }
      else if (isNaN(rx)) { rx = ry; }
      else if (isNaN(ry)) { ry = rx; }
      rx = Math.min(Math.max(rx, 0), w / 2);
      ry = Math.min(Math.max(ry, 0), h / 2);

      if (rx === 0 || ry === 0) {
        return 'M' + x + ',' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z';
      }
      // Clockwise from the top-left corner's end point.
      return 'M' + (x + rx) + ',' + y +
        'H' + (x + w - rx) +
        'A' + rx + ',' + ry + ' 0 0 1 ' + (x + w) + ',' + (y + ry) +
        'V' + (y + h - ry) +
        'A' + rx + ',' + ry + ' 0 0 1 ' + (x + w - rx) + ',' + (y + h) +
        'H' + (x + rx) +
        'A' + rx + ',' + ry + ' 0 0 1 ' + x + ',' + (y + h - ry) +
        'V' + (y + ry) +
        'A' + rx + ',' + ry + ' 0 0 1 ' + (x + rx) + ',' + y + 'Z';
    }

    if (tag === 'circle') {
      var cx = n(node, 'cx'), cy = n(node, 'cy'), r = n(node, 'r');
      if (!(r > 0)) return '';
      return 'M' + (cx - r) + ',' + cy +
        'A' + r + ',' + r + ' 0 1 0 ' + (cx + r) + ',' + cy +
        'A' + r + ',' + r + ' 0 1 0 ' + (cx - r) + ',' + cy + 'Z';
    }

    if (tag === 'ellipse') {
      var ecx = n(node, 'cx'), ecy = n(node, 'cy');
      // rx/ry may be "auto", which resolves to the other radius.
      var erx = n(node, 'rx', NaN), ery = n(node, 'ry', NaN);
      if (isNaN(erx) && isNaN(ery)) return '';
      if (isNaN(erx)) erx = ery;
      if (isNaN(ery)) ery = erx;
      if (!(erx > 0) || !(ery > 0)) return '';
      return 'M' + (ecx - erx) + ',' + ecy +
        'A' + erx + ',' + ery + ' 0 1 0 ' + (ecx + erx) + ',' + ecy +
        'A' + erx + ',' + ery + ' 0 1 0 ' + (ecx - erx) + ',' + ecy + 'Z';
    }

    if (tag === 'line') {
      return 'M' + n(node, 'x1') + ',' + n(node, 'y1') +
             'L' + n(node, 'x2') + ',' + n(node, 'y2');
    }

    if (tag === 'polyline' || tag === 'polygon') {
      var raw = (node.getAttribute('points') || '').trim();
      if (!raw) return '';
      // Points may be separated by commas, whitespace, or bare minus signs.
      var pts = raw.replace(/,/g, ' ').replace(/(\d)-/g, '$1 -').split(/\s+/).map(Number);
      if (pts.length < 4) return '';
      var d = 'M' + pts[0] + ',' + pts[1];
      for (var i = 2; i + 1 < pts.length; i += 2) d += 'L' + pts[i] + ',' + pts[i + 1];
      if (tag === 'polygon') d += 'Z';
      return d;
    }

    return '';
  }

  /**
   * Ensures the root <svg> carries explicit pixel width/height, which the
   * browser needs before it will rasterise the blob into an <img>.
   */
  function normalizeSvg(svgText) {
    try {
      var svg = String(svgText || '').trim();
      if (!svg) return svg;
      var hasW = /<svg[^>]+\bwidth\s*=\s*["'][\d.]/.test(svg);
      var hasH = /<svg[^>]+\bheight\s*=\s*["'][\d.]/.test(svg);
      if (hasW && hasH) return svg;

      var vb = svg.match(/viewBox\s*=\s*["']([^"']+)["']/);
      if (vb) {
        var parts = vb[1].trim().split(/[\s,]+/).map(Number);
        var vw = parts[2] || 220, vh = parts[3] || 220;
        return svg.replace(/(<svg)(\s|>)/, '$1 width="' + vw + '" height="' + vh + '"$2');
      }
      return svg.replace(/(<svg)(\s|>)/, '$1 width="220" height="220" viewBox="0 0 220 220"$2');
    } catch (e) {
      return svgText;
    }
  }

  /** Is this node (or an ancestor up to the svg root) hidden? */
  function isHidden(node, root) {
    var el = node;
    while (el && el !== root.parentNode) {
      if (el.nodeType === 1) {
        var cs = null;
        try { cs = window.getComputedStyle(el); } catch (e) { /* ignore */ }
        if (cs) {
          if (cs.display === 'none' || cs.visibility === 'hidden') return true;
          if (parseFloat(cs.opacity) === 0) return true;
        }
      }
      el = el.parentNode;
    }
    return false;
  }

  /**
   * Matrix mapping a node's local user units into the root SVG's viewport
   * PIXELS — the same space the rasterised <img> is drawn in.
   *
   * Note this deliberately does not use rootCTM.inverse() * nodeCTM: both CTMs
   * already include the viewBox transform, so dividing them cancels it out and
   * yields viewBox units instead of pixels. A logo with viewBox="0 0 192 106.5"
   * and width="384" would then trace at half scale in the top-left corner.
   * Subtracting the SVG's own client origin from the node's screen CTM keeps the
   * viewBox scale (and any preserveAspectRatio letterboxing) intact.
   */
  function localToViewport(node, svgEl, svgRect) {
    try {
      var m = node.getScreenCTM();
      if (!m || !svgRect) return IDENTITY;
      return {
        a: m.a, b: m.b, c: m.c, d: m.d,
        e: m.e - svgRect.left,
        f: m.f - svgRect.top
      };
    } catch (e) {
      return IDENTITY;
    }
  }

  /** Average scale factor of a matrix — used to convert lengths. */
  function matrixScale(m) {
    var sx = Math.sqrt(m.a * m.a + m.b * m.b);
    var sy = Math.sqrt(m.c * m.c + m.d * m.d);
    var s = (sx + sy) / 2;
    return s > 0 ? s : 1;
  }

  /**
   * Parses SVG source and measures every drawable shape.
   * Returns [{ d, length, color, strokeWidth, matrix }] in document order.
   * `length` and `strokeWidth` are in the path's LOCAL units, to be used with
   * `matrix` applied to the canvas context.
   * Requires a DOM — returns [] anywhere else.
   */
  function extractPaths(svgText) {
    if (typeof document === 'undefined') return [];
    var host = null;
    try {
      host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      // Must be laid out (not display:none) or getScreenCTM returns null.
      host.style.cssText = 'position:absolute;opacity:0;pointer-events:none;top:-99999px;left:-99999px;';
      host.innerHTML = normalizeSvg(svgText);
      document.body.appendChild(host);

      var svgEl = host.querySelector('svg');
      if (!svgEl) return [];

      var nodes = svgEl.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon');
      var out = [];
      var svgRect = svgEl.getBoundingClientRect();

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        // A <defs>/<clipPath>/<mask> member is never painted; tracing it would
        // draw geometry the viewer cannot see in the logo itself.
        if (node.closest && node.closest('defs,clipPath,mask,pattern,marker,symbol')) continue;
        if (isHidden(node, svgEl)) continue;

        var d = shapeToPathD(node);
        if (!d) continue;

        var length = 0;
        try {
          if (node.getTotalLength) length = node.getTotalLength();
        } catch (e) { /* some shapes refuse measurement */ }
        // A rect's getTotalLength ignores our rounded-corner rewrite, so measure
        // the generated path instead whenever the browser gives us nothing sane.
        if (!(length > 0)) length = measurePathLength(d) || 1000;

        var stroke = '', fill = '', strokeWidth = '';
        try {
          var cs = window.getComputedStyle(node);
          if (cs.stroke && cs.stroke !== 'none') stroke = cs.stroke;
          if (cs.fill && cs.fill !== 'none') fill = cs.fill;
          strokeWidth = cs.strokeWidth || '';
        } catch (e) { /* fall through to attributes */ }

        if (!stroke) stroke = node.getAttribute('stroke') || '';
        if (!fill) fill = node.getAttribute('fill') || '';
        if (!strokeWidth) strokeWidth = node.getAttribute('stroke-width') || '2';

        // Gradients and patterns resolve to url(#id), which canvas cannot stroke.
        if (stroke.indexOf('url(') === 0) stroke = '';
        if (fill.indexOf('url(') === 0) fill = '';

        var matrix = localToViewport(node, svgEl, svgRect);

        out.push({
          d: d,
          length: length,
          color: stroke || fill || FALLBACK_COLOR,
          strokeWidth: parseFloat(strokeWidth) || 2,
          matrix: matrix,
          scale: matrixScale(matrix)
        });
      }
      return out;
    } catch (e) {
      return [];
    } finally {
      // Always tear the probe node down, even if measurement threw partway.
      if (host && host.parentNode) host.parentNode.removeChild(host);
      releaseMeasurer();
    }
  }

  // A detached <path> used to measure generated `d` strings (rounded rects in
  // particular, where the element's own getTotalLength describes the sharp box).
  var _measureSvg = null, _measurePath = null;
  function measurePathLength(d) {
    if (typeof document === 'undefined') return 0;
    try {
      if (!_measurePath) {
        var NS = 'http://www.w3.org/2000/svg';
        _measureSvg = document.createElementNS(NS, 'svg');
        _measureSvg.setAttribute('width', '0');
        _measureSvg.setAttribute('height', '0');
        _measureSvg.style.cssText = 'position:absolute;opacity:0;pointer-events:none;top:-99999px;left:-99999px;';
        _measurePath = document.createElementNS(NS, 'path');
        _measureSvg.appendChild(_measurePath);
        document.body.appendChild(_measureSvg);
      }
      _measurePath.setAttribute('d', d);
      return _measurePath.getTotalLength() || 0;
    } catch (e) {
      return 0;
    }
  }
  function releaseMeasurer() {
    if (_measureSvg && _measureSvg.parentNode) _measureSvg.parentNode.removeChild(_measureSvg);
    _measureSvg = null;
    _measurePath = null;
  }

  /** Point at a distance along a `d` string, in the path's local units. */
  function pointAtLength(d, dist) {
    if (typeof document === 'undefined') return null;
    try {
      var NS = 'http://www.w3.org/2000/svg';
      if (!_headSvg) {
        _headSvg = document.createElementNS(NS, 'svg');
        _headSvg.setAttribute('width', '0');
        _headSvg.setAttribute('height', '0');
        _headSvg.style.cssText = 'position:absolute;opacity:0;pointer-events:none;top:-99999px;left:-99999px;';
        _headPath = document.createElementNS(NS, 'path');
        _headSvg.appendChild(_headPath);
        document.body.appendChild(_headSvg);
      }
      if (_headD !== d) { _headPath.setAttribute('d', d); _headD = d; }
      return _headPath.getPointAtLength(dist);
    } catch (e) {
      return null;
    }
  }
  var _headSvg = null, _headPath = null, _headD = null;

  var API = {
    extractPaths: extractPaths,
    normalizeSvg: normalizeSvg,
    shapeToPathD: shapeToPathD,
    pointAtLength: pointAtLength
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.SvgPaths = API;
  } else {
    global.SvgPaths = API;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
