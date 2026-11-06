/** Red dot with white ring + ink outline, as in the design. */
export function createDotMarker(size = 18): HTMLElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:var(--color-accent);border:3px solid #fff;box-sizing:border-box;box-shadow:0 0 0 2px var(--color-ink)`;
  return el;
}
