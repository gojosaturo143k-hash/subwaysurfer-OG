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

// Log resolved root and target URL to help confirm deployment version
console.info('[master-loader v=773508334] computed root:', root, 'leaderboardUrl:', root + 'leaderboard.js');

sdkScript.onload = function() {
    // After poki-sdk.js is loaded, inject leaderboard integration script and then load the Unity loader.
    try {
        var lb = document.createElement("script");
        lb.src = root + "leaderboard.js";
        // ensure the script executes in insertion order
        lb.async = false;
        lb.defer = false;

        // on success, log and then append unity loader
        lb.onload = function() {
            console.info('[master-loader v=773508334] leaderboard.js loaded and executed:', lb.src);
            var i = document.createElement("script");
            i.src = root + loader;
            i.async = false;
            document.body.appendChild(i);
        };

        // on error, log and still append unity loader so game never broken
        lb.onerror = function(e) {
            console.error('[master-loader v=773508334] Failed to load leaderboard.js from', lb.src, e);
            var i = document.createElement("script");
            i.src = root + loader;
            i.async = false;
            document.body.appendChild(i);
        };

        // append the leaderboard script (starts download + will execute when ready)
        document.body.appendChild(lb);

        // Fallback: if onload did not fire within 12s, append unity loader to avoid blocking indefinitely
        setTimeout(function() {
            if (!window.__master_loader_unity_appended) {
                console.warn('[master-loader v=773508334] fallback: appending unity loader after timeout');
                var i = document.createElement("script");
                i.src = root + loader;
                i.async = false;
                document.body.appendChild(i);
                window.__master_loader_unity_appended = true;
            }
        }, 12000);

    } catch (e) {
        console.error("Failed to inject leaderboard script:", e);
        // fallback: still load unity loader
        var i = document.createElement("script");
        i.src = root + loader;
        document.body.appendChild(i);
    }
};

document.body.appendChild(sdkScript);
