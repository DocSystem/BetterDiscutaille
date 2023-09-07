async function importJS(file) {
    return new Promise((resolve, reject) => {
        const imported = document.createElement('script');
        imported.src = chrome.runtime.getURL(file);
        imported.onload = function () {
            console.log("[BETTER DISCUTAILLE] " + file + " loaded!");
            this.remove();
            resolve(true);
        }
        imported.onerror = function (e) {
            console.log("[BETTER DISCUTAILLE] " + file + " not loaded!");
            reject(e);
        }
        document.body.appendChild(imported);
    });
}

function importCSS(file) {
    const imported = document.createElement('link');
    imported.rel = "stylesheet";
    imported.href = chrome.runtime.getURL(file);
    document.head.appendChild(imported);
}

window.onload = async function() {
    await importJS('librairies/config.js');
    await importJS('librairies/gui.js');
    await importJS('librairies/conversion.js');
    await importJS('librairies/crypto.js');
    await importJS('betterdiscutaille.js');
    importCSS('betterdiscutaille.css');
}
