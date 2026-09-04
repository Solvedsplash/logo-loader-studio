"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SvgPaths from "@/lib/svg-paths";

/** A neutral placeholder so the stage is never empty on first load. */
export function defaultLogoSvg() {
  return (
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>" +
    "<circle cx='110' cy='110' r='84' fill='none' stroke='#8b5cf6' stroke-width='10'/>" +
    "<path d='M74 112l24 24 48-56' fill='none' stroke='#8b5cf6' stroke-width='12' " +
    "stroke-linecap='round' stroke-linejoin='round'/>" +
    "</svg>"
  );
}

const RASTER_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Loads a logo (SVG source or raster file) into an <img> plus measured path data.
 *
 * Handles the two leaks the previous implementation had: every object URL is
 * revoked once the image has decoded, and a load that is superseded before it
 * finishes is discarded instead of clobbering the newer logo.
 */
export function useLogo() {
  const [svgText, setSvgText] = useState(() => defaultLogoSvg());
  const [image, setImage] = useState(null);
  const [paths, setPaths] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isRaster, setIsRaster] = useState(false);
  const [error, setError] = useState(null);

  // Incremented on every load; a stale callback compares against it and bails.
  const loadToken = useRef(0);

  useEffect(() => {
    if (!svgText) return;
    const token = ++loadToken.current;

    const normalized = SvgPaths.normalizeSvg(svgText);
    const blob = new Blob([normalized], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (token !== loadToken.current) return; // superseded — drop it
      setImage(img);
      setError(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (token !== loadToken.current) return;
      setError("That file could not be rendered as an image.");
    };
    img.src = url;

    // Path measurement is synchronous and independent of decoding.
    setPaths(isRaster ? [] : SvgPaths.extractPaths(svgText));

    return () => {
      // If the effect re-runs before onload, the handlers above will see a stale
      // token; revoking here as well would race with a decode still in flight.
      loadToken.current = token + 1;
    };
  }, [svgText, isRaster]);

  const loadFile = useCallback(async (file) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);

    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

    if (isSvg) {
      const text = await file.text();
      if (!/<svg[\s>]/i.test(text)) {
        setError("That doesn't look like a valid SVG file.");
        return;
      }
      setIsRaster(false);
      setSvgText(text);
      return;
    }

    if (!RASTER_TYPES.includes(file.type) && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      setError("Unsupported file. Use an SVG, PNG, JPG or WebP.");
      return;
    }

    // Raster logos are wrapped in an SVG so every downstream path — preview,
    // client export and the Puppeteer sandbox — handles exactly one input shape.
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const dims = await new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve({ w: probe.naturalWidth || 220, h: probe.naturalHeight || 220 });
      probe.onerror = () => resolve({ w: 220, h: 220 });
      probe.src = dataUrl;
    });

    setIsRaster(true);
    setSvgText(
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${dims.w}" height="${dims.h}" viewBox="0 0 ${dims.w} ${dims.h}">` +
        `<image href="${dataUrl}" xlink:href="${dataUrl}" width="${dims.w}" height="${dims.h}"/>` +
        `</svg>`
    );
  }, []);

  const reset = useCallback(() => {
    setFileName("");
    setIsRaster(false);
    setError(null);
    setSvgText(defaultLogoSvg());
  }, []);

  return { svgText, image, paths, fileName, isRaster, error, loadFile, reset };
}
