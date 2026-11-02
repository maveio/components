/** Fit authored caption lines without changing their text or WebVTT markup. */
export function fitSubtitleText(element: HTMLElement): void {
  element.style.removeProperty('font-size');
  element.style.removeProperty('white-space');
  if (!element.textContent?.trim() || element.clientWidth === 0) return;

  const lines = element.innerText.split('\n');
  if (lines.length > 2 || lines.some((line) => [...line].length > 42)) return;

  const style = getComputedStyle(element);
  const baseSize = parseFloat(style.fontSize);
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  element.style.whiteSpace = 'pre';
  let size = baseSize;
  if (!Number.isFinite(size)) return;
  // Font hinting and fractional layout can change widths after scaling.
  for (let attempt = 0; attempt < 3; attempt++) {
    const available = element.clientWidth - padding;
    const required = element.scrollWidth - padding;
    if (available <= 2 || required <= available) break;
    size *= (available - 2) / required;
    element.style.fontSize = `${size}px`;
  }
}

export function observeSubtitleLayout(element: HTMLElement): () => void {
  let active = true;
  const fit = () => {
    if (active) fitSubtitleText(element);
  };
  const observer =
    typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
  if (element.parentElement) observer?.observe(element.parentElement);
  void element.ownerDocument.fonts?.ready.then(fit);
  fit();
  return () => {
    active = false;
    observer?.disconnect();
  };
}
