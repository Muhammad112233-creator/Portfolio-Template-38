/**
 * Keeps the Tab key honest on a page full of pinned, overlapping scenes.
 *
 * Left alone, the browser would move focus to the next element in the
 * document even if that element belongs to a scene that is currently folded
 * away, covered or several screens off, and it would scroll there in one
 * jump. Here, Tab only visits what can actually be seen and clicked right
 * now, and it never scrolls. Scrolling stays in the hands of the visitor.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function reachable(element: HTMLElement) {
  if (element.dataset.tabAlways !== undefined) return true;
  if (element.tabIndex < 0) return false;
  if (element.closest('[inert], [aria-hidden="true"]')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth) return false;
  const style = getComputedStyle(element);
  if (style.visibility === 'hidden' || style.pointerEvents === 'none') return false;

  // is it really on top at its own centre, or is another scene covering it?
  const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
  const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
  const hit = document.elementFromPoint(x, y);
  if (!hit) return false;
  if (element.contains(hit) || hit.contains(element)) return true;
  // form controls are often hit through their <label>
  const label = hit.closest('label');
  return Boolean(label && label.contains(element));
}

export function manageTabKey() {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    // an open <dialog> traps focus natively
    if (document.querySelector('dialog[open]')) return;

    const candidates = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(reachable);
    if (candidates.length === 0) return;

    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const index = current ? candidates.indexOf(current) : -1;
    let next: HTMLElement | undefined;

    if (index !== -1) {
      next = candidates[index + (event.shiftKey ? -1 : 1)];
    } else if (current && current !== document.body) {
      // focus sits on something that is no longer reachable: continue from its place in the document
      const after = candidates.filter((candidate) => current.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING);
      const before = candidates.filter((candidate) => current.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_PRECEDING);
      next = event.shiftKey ? before[before.length - 1] : after[0];
    } else {
      next = event.shiftKey ? candidates[candidates.length - 1] : candidates[0];
    }

    // at either end, hand over to the browser so focus can leave the page
    if (!next) return;
    event.preventDefault();
    next.focus({ preventScroll: true });
  };

  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}
