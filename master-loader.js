"use strict";
var scripts = document.getElementsByTagName("script"),
    scriptUrl = scripts[scripts.length - 1].src,
    root = scriptUrl.split("master-loader.js")[0],
    loaders = {
        unity: "unity.js"
    };
if (0 <= window.location.href.indexOf("pokiForceLocalLoader") && (loaders.unity = "./unity.js", root = "./loaders"), !window.config) throw Error("window.config not found");
var loader = loaders[window.config.loader];
if (!loader) throw Error('Loader "' + window.config.loader + '" not found');
if (!window.config.unityWebglLoaderUrl) {
    var versionSplit = window.config.unityVersion ? window.config.unityVersion.split(".") : [],
        year = versionSplit[0],
        minor = versionSplit[1];
    window.config.unityWebglLoaderUrl = "./UnityLoader.2019.2.js"
}
var sdkScript = document.createElement("script");
sdkScript.src = "./poki-sdk.js";

// DEBUG: log resolved root and leaderboard URL so we can confirm the deployed loader
console.log('[master-loader] computed root:', root, 'leaderboardUrl:', root + 'leaderboard.js');

sdkScript.onload = function() {
    try {
        // Create leaderboard script element
        var lb = document.createElement("script");
        lb.src = root + "leaderboard.js";
        lb.async = false;
        lb.defer = false;
        console.log('[master-loader] Loading leaderboard.js:', lb.src);

        // When leaderboard.js is loaded/ran, load score probe and then Unity loader
        lb.onload = function() {
            console.log('[master-loader] leaderboard.js loaded:', lb.src);

            // load score-probe.js (separate probe that must not replace roundEnd)
            try {
                var sp = document.createElement('script');
                sp.src = root + 'score-probe.js';
                sp.async = false;
                sp.defer = false;
                console.log('[master-loader] Loading score-probe.js:', sp.src);

                sp.onload = function() {
                    console.log('[master-loader] score-probe.js loaded:', sp.src);
                    // finally append Unity loader
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                };

                sp.onerror = function(e) {
                    console.error('[master-loader] Failed to load score-probe.js from', sp.src, e);
                    // still append unity loader
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                };

                document.body.appendChild(sp);

            } catch (e) {
                console.error('[master-loader] error injecting score-probe.js', e);
                var i = document.createElement("script");
                i.src = root + loader;
                i.async = false;
                document.body.appendChild(i);
                window.__master_loader_unity_appended = true;
            }
        };

        lb.onerror = function(e) {
            console.error('[master-loader] Failed to load leaderboard.js from', lb.src, e);
            // try to load the score probe anyway, then unity loader
            try {
                var sp2 = document.createElement('script');
                sp2.src = root + 'score-probe.js';
                sp2.async = false;
                sp2.defer = false;
                sp2.onload = function() {
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                };
                sp2.onerror = function() {
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                };
                document.body.appendChild(sp2);
            } catch (e2) {
                var i = document.createElement("script");
                i.src = root + loader;
                document.body.appendChild(i);
                window.__master_loader_unity_appended = true;
            }
        };

        document.body.appendChild(lb);

        // Fallback: ensure unity loader appended after 12s if onload never fires
        setTimeout(function() {
            if (!window.__master_loader_unity_appended) {
                console.warn('[master-loader] fallback: appending unity loader after timeout');
                var i = document.createElement("script");
                i.src = root + loader;
                i.async = false;
                document.body.appendChild(i);
                window.__master_loader_unity_appended = true;
            }
        }, 12000);

    } catch (e) {
        console.error('[master-loader] exception injecting leaderboard/score probes:', e);
        var i = document.createElement("script");
        i.src = root + loader;
        document.body.appendChild(i);
    }
};

document.body.appendChild(sdkScript);
