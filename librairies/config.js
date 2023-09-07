let config = {};

function saveConfig() {
    window.localStorage.setItem("config", JSON.stringify(config));
}

function resetConfig() {
    window.localStorage.removeItem("config");
    document.location.reload();
}

function loadConfig() {
    if (window.localStorage.getItem("config") === null) {
        config = {
            "pseudo": "",
            "status": "",
            "known_users": [],
            "trusted_users": [],
            "personal_key": null,
            "settings": {
                "sign_messages": true
            }
        };
        saveConfig();
    }
    let configObject = JSON.parse(window.localStorage.getItem("config"));

    config = new Proxy(configObject, {
        set: function (target, property, value) {
            target[property] = value;
            // console.log(`[BETTER DISCUTAILLE] Config updated: ${property} = ${value}`);
            saveConfig();
            return true;
        },
        get: function (target, property) {
            return target[property];
        }
    });
}
loadConfig();
