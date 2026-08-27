// leaderboard.js (probe-only)
// Very obvious runtime logs so you can confirm execution and wrapper install
console.log('[Leaderboard probe] FILE EXECUTED');

// Mark loaded time for diagnostics
window.__leaderboard_probe_loadedAt = Date.now();

// Probe: wait until window.PokiSDK exists, then install wrapper for roundEnd.
// Keep retrying for up to MAX_WAIT_MS so slow initialization is handled.
(function installRoundEndProbe() {
  const MAX_WAIT_MS = 60000; // wait up to 60 seconds
  const POLL_MS = 250;
  let waited = 0;

  console.log('[Leaderboard probe] installRoundEndProbe: start');

  function tryInstall() {
    if (window.PokiSDK) {
      console.log('[Leaderboard probe] PokiSDK detected');
      try {
        const origRoundEnd = window.PokiSDK.roundEnd && window.PokiSDK.roundEnd.bind(window.PokiSDK);

        if (window.PokiSDK.roundEnd && window.PokiSDK.roundEnd.__roundEndProbeInstalled) {
          console.log('[Leaderboard probe] wrapper already installed');
          window.__poki_roundEnd_probe_installed = true;
          return true;
        }

        function wrapper(...args) {
          try {
            window.__poki_roundEnd_lastArgs = args;
            window.__poki_roundEnd_calls = window.__poki_roundEnd_calls || [];
            window.__poki_roundEnd_calls.unshift({ ts: Date.now(), args: args });
            if (window.__poki_roundEnd_calls.length > 100) window.__poki_roundEnd_calls.length = 100;

            console.info('[Leaderboard probe] PokiSDK.roundEnd called with args:', args);
          } catch (err) {
            console.warn('[Leaderboard probe] error while recording roundEnd args:', err);
          }

          try {
            return typeof origRoundEnd === 'function' ? origRoundEnd(...args) : undefined;
          } catch (err) {
            console.error('[Leaderboard probe] error calling original roundEnd:', err);
            return undefined;
          }
        }

        wrapper.__roundEndProbeInstalled = true;
        window.PokiSDK.roundEnd = wrapper;
        window.__poki_roundEnd_probe_installed = true;
        console.log('[Leaderboard probe] roundEnd WRAPPED');
        console.info('[Leaderboard probe] Installed roundEnd probe (no submission).');
        return true;
      } catch (e) {
        console.error('[Leaderboard probe] exception while installing wrapper:', e);
        return false;
      }
    }

    if (waited >= MAX_WAIT_MS) {
      console.warn('[Leaderboard probe] timeout waiting for window.PokiSDK; giving up after', waited, 'ms');
      return false;
    }
    waited += POLL_MS;
    setTimeout(tryInstall, POLL_MS);
  }

  window.addEventListener('pokiAppReady', function() {
    console.log('[Leaderboard probe] got pokiAppReady event - attempting install');
    tryInstall();
  }, false);

  tryInstall();
})();
