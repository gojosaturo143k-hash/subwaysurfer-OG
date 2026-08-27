// leaderboard.js (probe + instrumentation)
// Probe that installs roundEnd wrapper and instruments common JS↔Unity hooks to find the real score.
// Very obvious runtime logs so you can confirm execution and gathered traces.

console.log('[Leaderboard probe] FILE EXECUTED');
window.__leaderboard_probe_loadedAt = Date.now();
window.__lb_instrumentation_calls = window.__lb_instrumentation_calls || [];

function lb_log(kind, name, details) {
  var entry = { ts: Date.now(), kind: kind, name: name, details: details };
  window.__lb_instrumentation_calls.unshift(entry);
  if (window.__lb_instrumentation_calls.length > 200) window.__lb_instrumentation_calls.length = 200;
  // also print to console for quick visibility
  console.info('[Leaderboard probe][' + kind + ']', name, details);
}

// Wrap function helper (non-destructive forwarding)
function lb_wrap(obj, prop, displayName) {
  try {
    if (!obj || typeof obj[prop] !== 'function') return false;
    var orig = obj[prop];
    if (orig && orig.__lb_wrapped) return false; // already wrapped
    obj[prop] = function() {
      var args = Array.prototype.slice.call(arguments);
      lb_log('call', displayName || prop, { args: args });
      try {
        return orig.apply(this, arguments);
      } catch (e) {
        console.error('[Leaderboard probe] wrapped function error', displayName || prop, e);
        throw e;
      }
    };
    obj[prop].__lb_wrapped = true;
    return true;
  } catch (e) {
    console.warn('[Leaderboard probe] failed to wrap', prop, e);
    return false;
  }
}

// Instrument PokiSDK methods we care about
function instrumentPokiSDK() {
  if (!window.PokiSDK) return false;
  lb_log('info', 'instrumentPokiSDK', { keys: Object.keys(window.PokiSDK) });
  var methods = ['gameplayStop','gameplayStart','roundStart','roundEnd','roundEndWithScore','getLeaderboard','sendHighscore'];
  methods.forEach(function(m) {
    if (typeof window.PokiSDK[m] === 'function') {
      lb_wrap(window.PokiSDK, m, 'PokiSDK.' + m);
    } else {
      // define a safe forwarder if not present to record future calls if put on later
      // (we avoid defining to not break SDK behavior)
    }
  });
  return true;
}

// Wrap global functions of interest if present
function instrumentGlobalFunctions() {
  var keys = Object.keys(window);
  var keywords = ['score','Score','gameplay','round','run','leaderboard','highscore','bestScore','distance','coins','Report','report','SendScore','SendMessage','UnitySendMessage','OnGameOver','GameOver'];
  keys.forEach(function(k) {
    try {
      if (typeof window[k] === 'function') {
        for (var i = 0; i < keywords.length; i++) {
          var kw = keywords[i];
          if (k.indexOf(kw) !== -1) {
            lb_wrap(window, k, 'window.' + k);
            break;
          }
        }
      }
    } catch (e) {}
  });
}

// Instrument Module.ccall and Module.cwrap when Module appears
function instrumentModuleApi() {
  try {
    var M = window.Module || (window.UnityLoader && window.UnityLoader.Modules && Object.keys(window.UnityLoader.Modules).length ? window.UnityLoader.Modules[Object.keys(window.UnityLoader.Modules)[0]].Module : null);
    if (!M && window.UnityLoader && window.UnityLoader.Blobs) {
      // check UnityLoader.Blobs for a Module container
      for (var blob in window.UnityLoader.Blobs) {
        try {
          var obj = window.UnityLoader.Blobs[blob];
          if (obj && obj.Module) { M = obj.Module; break; }
        } catch (e) {}
      }
    }
    if (!M) return false;
    if (typeof M.ccall === 'function') lb_wrap(M, 'ccall', 'Module.ccall');
    if (typeof M.cwrap === 'function') lb_wrap(M, 'cwrap', 'Module.cwrap');
    return true;
  } catch (e) {
    console.warn('[Leaderboard probe] instrumentModuleApi error', e);
    return false;
  }
}

// Intercept fetch and XHR to log network requests (lightweight)
(function instrumentNetwork() {
  try {
    var origFetch = window.fetch;
    if (origFetch && !origFetch.__lb_wrapped) {
      window.fetch = function() {
        var args = Array.prototype.slice.call(arguments);
        try { lb_log('network', 'fetch', { args: args }); } catch (e) {}
        return origFetch.apply(this, arguments).then(function(resp) {
          try { lb_log('network', 'fetch.response', { url: resp.url, status: resp.status }); } catch (e) {}
          return resp;
        });
      };
      window.fetch.__lb_wrapped = true;
    }
  } catch (e) {}

  try {
    var XHRsend = XMLHttpRequest.prototype.send;
    if (XHRsend && !XMLHttpRequest.prototype.send.__lb_wrapped) {
      XMLHttpRequest.prototype.send = function() {
        try { lb_log('network', 'xhr.send', { method: this.method || this._method || 'unknown', url: this._url || this.responseURL || this.url }); } catch (e) {}
        return XHRsend.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send.__lb_wrapped = true;

      // wrap open to capture method+url
      var XHRopen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url) {
        try { this._method = method; this._url = url; } catch (e) {}
        return XHRopen.apply(this, arguments);
      };
    }
  } catch (e) {}
})();

// High-level installer that performs several instrumentation steps and retries until they succeed or time out
(function installAllInstruments() {
  var MAX_WAIT_MS = 60000; var POLL_MS = 300; var waited = 0;
  function attempt() {
    try {
      // always ensure roundEnd wrapper from earlier is installed
      var pokiOk = false;
      if (window.PokiSDK) {
        pokiOk = true;
        instrumentPokiSDK();
      }
      instrumentGlobalFunctions();
      instrumentModuleApi();
      // keep trying until master attempt timeouts
      if (pokiOk) {
        lb_log('status', 'instrumentsInstalled', { poki: pokiOk });
        // if poki exists, we consider instrumentation active
        return true;
      }
    } catch (e) { console.warn('[Leaderboard probe] attempt error', e); }
    if (waited >= MAX_WAIT_MS) {
      lb_log('status','installTimeout',{ waited: waited });
      return false;
    }
    waited += POLL_MS;
    setTimeout(attempt, POLL_MS);
  }
  attempt();
})();

// Export a helper to dump collected traces quickly from console
window.__lb_dump = function() { return window.__lb_instrumentation_calls.slice(0,100); };

console.log('[Leaderboard probe] instrumentation installed (waiting for events)');
