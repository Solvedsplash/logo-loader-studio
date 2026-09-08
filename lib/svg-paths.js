/**
 * SVG shape → path extraction.
 * ─────────────────────────────────────────────────────────────────
 * Like core-engine.js, this is dependency-free UMD ES5 because it runs both as
 * a normal import in the browser and injected as source text into Puppeteer.
 * Keeping one copy is what guarantees the preview and the server export measure
 * the same paths, with the same lengths and the same colours.
 */

(function (global) {
  'use strict';

  var FALLBACK_COLOR = '#8b5cf6';

  /** Converts any primitive SVG shape into equivalent path `d` data. */
  function shapeToPathD(node) {
    var tag = node.tagName.toLowerCase();
    var g = function (k, d) { var v = node.getAttribute(k); return v === null || v === '' ? (d || 0) : parseFloat(v); };

    if (tag === 'path') return node.getAttribute('d') || '';

    if (tag === 'rect') {
      var x = g('x'), y = g('y'), w = g('width'), h = g('height');
      if (!w || !h) return '';
      // Honour rx / ry for rounded rectangles — clamp to half the side length.
      var rxRaw = node.getAttribute('rx'), ryRaw = node.getAttribute('ry');
      var rx = rxRaw !== null && rxRaw !== '' ? parseFloat(rxRaw) : (ryRaw !== null && ryRaw !== '' ? parseFloat(ryRaw) : 0);
      var ry = ryRaw !== null && ryRaw !== '' ? parseFloat(ryRaw) : rx;
      rx = Math.min(Math.abs(rx), w / 2);
      ry = Math.min(Math.abs(ry), h / 2);
      if (!rx || !ry) {
        // Plain rectangle — straight edges.
        return 'M' + x + ',' + y + 'H' + (x + w) + 'V' + (y + h) + 'H' + x + 'Z';
      }
      // Rounded rectangle using arc segments so curves are preserved exactly.
      return (
        'M' + (x + rx) + ',' + y +
        'H' + (x + w - rx) +
        'A' + rx + ',' + ry + ',0,0,1,' + (x + w) + ',' + (y + ry) +
        'V' + (y + h - ry) +
        'A' + rx + ',' + ry + ',0,0,1,' + (x + w - rx) + ',' + (y + h) +
        'H' + (x + rx) +
        'A' + rx + ',' + ry + ',0,0,1,' + x + ',' + (y + h - ry) +
        'V' + (y + ry) +
        'A' + rx + ',' + ry + ',0,0,1,' + (x + rx) + ',' + y +
        'Z'
      );
    }

    if (tag === 'circle') {
      var cx = g('cx'), cy = g('cy'), r = g('r');
      if (!r) return '';
      return 'M' + (cx - r) + ',' + cy +
        'A' + r + ',' + r + ',0,1,0,' + (cx + r) + ',' + cy +
        'A' + r + ',' + r + ',0,1,0,' + (cx - r) + ',' + cy + 'Z';
    }

    if (tag === 'ellipse') {
      var ecx = g('cx'), ecy = g('cy'), erx = g('rx'), ery = g('ry');
      if (!erx || !ery) return '';
      return 'M' + (ecx - erx) + ',' + ecy +
        'A' + erx + ',' + ery + ',0,1,0,' + (ecx + erx) + ',' + ecy +
        'A' + erx + ',' + ery + ',0,1,0,' + (ecx - erx) + ',' + ecy + 'Z';
    }

    if (tag === 'line') {
      return 'M' + g('x1') + ',' + g('y1') + 'L' + g('x2') + ',' + g('y2');
    }

    if (tag === 'polyline' || tag === 'polygon') {
      var rawPts = (node.getAttribute('points') || '').trim();
      if (!rawPts) return '';
      var pts = rawPts.replace(/,/g, ' ').split(/\s+/).map(Number);
      if (pts.length < 4) return '';
      var pd = 'M' + pts[0] + ',' + pts[1];
      for (var i = 2; i + 1 < pts.length; i += 2) pd += 'L' + pts[i] + ',' + pts[i + 1];
      if (tag === 'polygon') pd += 'Z';
      return pd;
    }

    return '';
  }

  // Hidden SVG path element used to measure converted path strings accurately.
  var _lenMeasureEl = null;
  function measurePathLength(d) {
    if (!d || typeof document === 'undefined') return 1000;
    try {
      if (!_lenMeasureEl) {
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '0');
        svg.setAttribute('height', '0');
        svg.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
        _lenMeasureEl = document.createElementNS(svgNS, 'path');
        svg.appendChild(_lenMeasureEl);
        document.body.appendChild(svg);
      }
      _lenMeasureEl.setAttribute('d', d);
      return _lenMeasureEl.getTotalLength() || 1000;
    } catch (e) {
      return 1000;
    }
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

  /**
   * Parses SVG source and measures every drawable shape.
   * Returns [{ d, length, color, strokeWidth }] in document order.
   * Requires a DOM — returns [] anywhere else.
   */
  function extractPaths(svgText) {
    if (typeof document === 'undefined') return [];
    var host = null;
    try {
      host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;visibility:hidden;width:0;height:0;overflow:hidden;top:-9999px;left:-9999px;';
      host.innerHTML = normalizeSvg(svgText);
      document.body.appendChild(host);

      var svgEl = host.querySelector('svg');
      if (!svgEl) return [];

      var nodes = svgEl.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon');
      var out = [];

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var d = shapeToPathD(node);
        if (!d) continue;

        // Measure the *converted* path string (not the original element) so that
        // shapes like rounded rects — whose `d` uses arc commands — report the
        // correct length for the animated stroke-dasharray.
        var length = measurePathLength(d);

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

        out.push({
          d: d,
          length: length,
          color: stroke || fill || FALLBACK_COLOR,
          strokeWidth: parseFloat(strokeWidth) || 2
        });
      }
      return out;
    } catch (e) {
      return [];
    } finally {
      // Always tear the probe node down, even if measurement threw partway.
      if (host && host.parentNode) host.parentNode.removeChild(host);
    }
  }

  var API = {
    extractPaths: extractPaths,
    normalizeSvg: normalizeSvg,
    shapeToPathD: shapeToPathD,
    measurePathLength: measurePathLength
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else if (typeof window !== 'undefined') {
    window.SvgPaths = API;
  } else {
    global.SvgPaths = API;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
