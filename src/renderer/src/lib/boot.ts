// Ends the boot splash from index.html: let the tide rise for a moment, then
// drain it away to reveal the app (which has rendered underneath by now).

/** Long enough for the rise and the name to land; measured from page start. */
const MIN_SHOW_MS = 1900
/** Matches the drain transitions in index.html. */
const DRAIN_MS = 1300

export function finishBoot(): void {
  const boot = document.getElementById('boot')
  if (!boot) return

  let done = false
  const drain = (): void => {
    if (done) return
    done = true
    boot.classList.add('out')
    setTimeout(() => boot.remove(), DRAIN_MS)
  }

  boot.addEventListener('click', drain, { once: true })
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = reducedMotion ? 300 : Math.max(0, MIN_SHOW_MS - performance.now())
  setTimeout(drain, wait)
}
