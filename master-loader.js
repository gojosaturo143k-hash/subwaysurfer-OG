"use strict";
// Ensure this message appears immediately so deployed loader can be identified
console.log('[master-loader] CURRENT VERSION LOADED');

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

// Expose minimal config and an append function so leaderboard.js can append the Unity loader if desired
window.__master_loader_config = window.__master_loader_config || {};
window.__master_loader_config.root = root;
window.__master_loader_config.loaderPath = root + loader;

window.__appendUnity = window.__appendUnity || function() {
    try {
        if (window.__master_loader_unity_appended) return;
        var i = document.createElement("script");
        i.src = window.__master_loader_config.loaderPath || (root + loader);
        i.async = false;
        document.body.appendChild(i);
        window.__master_loader_unity_appended = true;
        console.log('[master-loader] Unity loader appended by leaderboard probe or caller:', i.src);
    } catch (e) {
        console.error('[master-loader] failed to append Unity loader', e);
    }
};

// Load poki-sdk.js first, then load leaderboard.js. Append Unity immediately after leaderboard.js has loaded.
var sdkScript = document.createElement("script");
sdkScript.src = "./poki-sdk.js";

sdkScript.onload = function() {
    try {
        var lb = document.createElement("script");
        lb.src = root + "leaderboard.js";
        // ensure leaderboard.js executes in insertion order
        lb.async = false;
        lb.defer = false;
        console.log('[master-loader] Loading leaderboard.js:', lb.src);

        lb.onload = function() {
            console.log('[master-loader] leaderboard.js loaded:', lb.src);
            // Immediately append the Unity loader once leaderboard.js finished loading.
            try {
                if (!window.__master_loader_unity_appended) {
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                    console.log('[master-loader] Unity loader appended after leaderboard.js load:', i.src);
                } else {
                    console.log('[master-loader] Unity loader already appended; skipping duplicate append.');
                }
            } catch (e) {
                console.error('[master-loader] failed to append Unity loader after leaderboard.js load', e);
            }
            // Note: leaderboard.js may continue instrumentation asynchronously; we do not wait for it.
        };

        lb.onerror = function(e) {
            console.error('[master-loader] Failed to load leaderboard.js from', lb.src, e);
            // If leaderboard fails to load, append Unity so game still runs.
            try {
                if (!window.__master_loader_unity_appended) {
                    var i = document.createElement("script");
                    i.src = root + loader;
                    i.async = false;
                    document.body.appendChild(i);
                    window.__master_loader_unity_appended = true;
                    console.log('[master-loader] Unity loader appended after leaderboard.js error:', i.src);
                }
            } catch (e2) {
                console.error('[master-loader] failed to append Unity loader in onerror handler', e2);
            }
        };

        document.body.appendChild(lb);
    } catch (e) {
        console.error('[master-loader] Failed to inject leaderboard script:', e);
        try {
            if (!window.__master_loader_unity_appended) {
                var i = document.createElement("script");
                i.src = root + loader;
                document.body.appendChild(i);
                window.__master_loader_unity_appended = true;
            }
        } catch (e2) {
            console.error('[master-loader] fallback failed to append Unity loader', e2);
        }
    }
};

document.body.appendChild(sdkScript);
