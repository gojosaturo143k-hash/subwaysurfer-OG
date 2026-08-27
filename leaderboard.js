// leaderboard.js (probe-only)
// Installs a lightweight probe that wraps window.PokiSDK.roundEnd to record runtime arguments.
// This file MUST be loaded after poki-sdk.js but before Unity instantiates the game. master-loader.js was updated to inject this file.

(function installRoundEndProbe() {
  const MAX_WAIT_MS = 10000; // stop trying after 10s
  const POLL_MS = 200;
  let waited = 0;

  function wrap() {
    if (!window.PokiSDK) return false;
    try {
      const original = window.PokiSDK.roundEnd && window.PokiSDK.roundEnd.bind(window.PokiSDK);

      // avoid double-wrapping
      if (window.PokiSDK.roundEnd && window.PokiSDK.roundEnd.__roundEndProbeInstalled) return true;

      function wrapper(...args) {
        try {
          // Expose last args for debugging
          window.__poki_roundEnd_lastArgs = args;

          // Keep a short recent-call log
          window.__poki_roundEnd_calls = window.__poki_roundEnd_calls || [];
          window.__poki_roundEnd_calls.unshift({ ts: Date.now(), args: args });
          if (window.__poki_roundEnd_calls.length > 20) window.__poki_roundEnd_calls.length = 20;

          // Console info for quick visibility
          console.info('[Leaderboard probe] PokiSDK.roundEnd called with args:', args);
        } catch (err) {
          console.warn('[Leaderboard probe] error recording roundEnd args:', err);
        } finally {
          // Always call original to preserve behavior
          try {
            return typeof original === 'function' ? original(...args) : undefined;
          } catch (e) {
            // don't let errors here break the game
            console.error('[Leaderboard probe] error calling original roundEnd:', e);
            return undefined;
          }
        }
      }

      wrapper.__roundEndProbeInstalled = true;
      window.PokiSDK.roundEnd = wrapper;
      console.info('[Leaderboard probe] Installed roundEnd probe (no submission).');
      return true;
    } catch (e) {
      console.error('[Leaderboard probe] failed to install probe', e);
      return false;
    }
  }

  function poll() {
    if (wrap()) return;
    if (waited >= MAX_WAIT_MS) {
      console.warn('[Leaderboard probe] timeout waiting for window.PokiSDK; probe not installed.');
      return;
    }
    waited += POLL_MS;
    setTimeout(poll, POLL_MS);
  }
  poll();
})();
