(() => {
  const PROBE_URL = '/health'
  const RECHECK_MS = 5000

  let isOffline = false
  let timer
  let inFlight

  function publish() {
    document.body.dispatchEvent(
      new CustomEvent('connectivity', { detail: { offline: isOffline } })
    )
  }

  function setIsOffline(nextState) {
    if (nextState === isOffline) return
    isOffline = nextState
    publish()
    clearInterval(timer)
    if (isOffline) timer = setInterval(probe, RECHECK_MS)
  }

  function probe() {
    inFlight ??= fetch(PROBE_URL, { cache: 'no-store' })
      .then((res) => setIsOffline(!res.ok))
      .catch(() => setIsOffline(true))
      .finally(() => { inFlight = undefined })
    return inFlight
  }

  document.addEventListener('datastar-fetch', (evt) => {
    switch (evt.detail.type) {
      // retry causes might be for a valid reason, so probe
      case 'retrying':
      case 'retries-failed':
        probe()
        break
      // a patch landing means connection is alive
      case 'datastar-patch-elements':
      case 'datastar-patch-signals':
        setIsOffline(false)
        break
      case 'error':
        window.notyf?.error(
          `Error requesting resource (${evt.detail.argsRaw?.status || 'unknown'})`
        )
        break
    }
  })

  addEventListener('offline', () => setIsOffline(true))
  addEventListener('online', probe)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isOffline) probe()
  })

  if (!navigator.onLine) isOffline = true

  setTimeout(publish)
  if (isOffline) timer = setInterval(probe, RECHECK_MS)
})()
