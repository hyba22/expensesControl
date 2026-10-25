import { useSyncExternalStore } from 'react'

// Follows the "dark" class the theme toggle puts on <html>, so charts can
// pick readable axis and grid colors.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

export function useIsDark() {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'))
}
