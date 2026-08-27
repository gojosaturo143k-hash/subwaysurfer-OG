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
sdkScript.src = "./poki-sdk.js", sdkScript.onload = function() {
    // After poki-sdk.js is loaded, inject leaderboard integration script (non-blocking) and then load the Unity loader.
    try {
        var lb = document.createElement("script");
        lb.src = root + "leaderboard.js";
        lb.async = true;
        document.body.appendChild(lb);
    } catch (e) {
        console.error("Failed to inject leaderboard script:", e);
    }

    var i = document.createElement("script");
    i.src = root + loader, document.body.appendChild(i)
}, document.body.appendChild(sdkScript);
