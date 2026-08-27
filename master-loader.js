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

// Expose minimal config and an append function so leaderboard.js can append the Unity loader only after probe installed
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

// Load poki-sdk.js first, then load leaderboard.js. Do NOT append Unity here; leaderboard.js will call __appendUnity when it's ready.
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
            // Do NOT append Unity here; leaderboard.js will call window.__appendUnity() after the probe is installed.
        };

        lb.onerror = function(e) {
            console.error('[master-loader] Failed to load leaderboard.js from', lb.src, e);
            // If leaderboard fails to load, we cannot rely on the probe — append Unity so game still runs.
            // Note: per instruction we avoid starting Unity before leaderboard.js has a chance to install the probe, but if leaderboard.js 404s we must not block the game entirely.
            var i = document.createElement("script");
            i.src = root + loader;
            i.async = false;
            document.body.appendChild(i);
            window.__master_loader_unity_appended = true;
        };

        document.body.appendChild(lb);
    } catch (e) {
        console.error('[master-loader] Failed to inject leaderboard script:', e);
        var i = document.createElement("script");
        i.src = root + loader;
        document.body.appendChild(i);
        window.__master_loader_unity_appended = true;
    }
};

document.body.appendChild(sdkScript);
