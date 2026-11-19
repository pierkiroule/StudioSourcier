import DOMPurify from "dompurify";
import type { Animation } from "./model";
const tags = [
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "rect",
  "line",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "animate",
  "animateTransform",
];
const attrs = [
  "xmlns",
  "viewBox",
  "width",
  "height",
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "points",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "opacity",
  "transform",
  "id",
  "offset",
  "stop-color",
  "stop-opacity",
  "attributeName",
  "values",
  "from",
  "to",
  "dur",
  "repeatCount",
  "type",
  "begin",
  "keyTimes",
  "calcMode",
  "additive",
];
export function validateSvg(source: string, still = false): string {
  if (source.length > 100000) throw Error("Le SVG dépasse 100 Ko.");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("Un document SVG valide est requis.");
  if (/<!DOCTYPE|<!ENTITY/i.test(source))
    throw Error("Les déclarations externes ne sont pas acceptées.");
  const allowedAnimations = new Set([
    "d",
    "opacity",
    "r",
    "rx",
    "ry",
    "cx",
    "cy",
    "x",
    "y",
    "transform",
    "stroke-width",
    "stroke-dashoffset",
  ]);
  for (const el of doc.querySelectorAll("*")) {
    if (!tags.map((t) => t.toLowerCase()).includes(el.localName.toLowerCase()))
      throw Error("Élément SVG non accepté : " + el.localName);
    for (const attr of el.attributes) {
      const name = attr.localName.toLowerCase();
      if (
        name.startsWith("on") ||
        name === "href" ||
        name === "style" ||
        (/javascript:|data:|https?:|url\s*\(/i.test(attr.value) &&
          name !== "xmlns")
      )
        throw Error(
          "Le SVG doit être autonome, sans script ni ressource externe.",
        );
    }
    if (el.localName.startsWith("animate")) {
      if (!allowedAnimations.has(el.getAttribute("attributeName") ?? ""))
        throw Error("Attribut d’animation non accepté.");
      if (
        el.hasAttribute("begin") &&
        !/^\d+(\.\d+)?s$/.test(el.getAttribute("begin")!)
      )
        throw Error("Début d’animation non accepté.");
      if (still) el.remove();
    }
  }
  const clean = DOMPurify.sanitize(
    new XMLSerializer().serializeToString(doc.documentElement),
    {
      ALLOWED_TAGS: tags,
      ALLOWED_ATTR: attrs,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      KEEP_CONTENT: false,
    },
  );
  if (!clean.startsWith("<svg")) throw Error("Le SVG n’a pas pu être validé.");
  return clean;
}
export function svgDataUrl(source: string, still = false): string {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(validateSvg(source, still))
  );
}
export function generatedSvg(animation: Animation, color = "#406d87"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 150">${Array.from(
    { length: animation.density },
    (_, i) => {
      const y = 25 + i * (100 / animation.density);
      return `<path d="M15 ${y} C75 ${y - animation.amplitude} 95 ${y + animation.amplitude} 150 ${y} S240 ${y - animation.amplitude} 305 ${y}" fill="none" stroke="${color}" stroke-width="${animation.thickness}" opacity=".65"><animateTransform attributeName="transform" type="translate" values="0 0;0 4;0 0" dur="${animation.speed}s" repeatCount="indefinite"/></path>`;
    },
  ).join("")}</svg>`;
}
