let config = {};

function saveConfig() {
    window.localStorage.setItem("config", JSON.stringify(config));
}

function loadConfig() {
    if (window.localStorage.getItem("config") === null) {
        config = {
            "pseudo": "",
            "status": "",
            "known_users": [],
            "verified_users": [],
            "personal_key": null
        };
        saveConfig();
    }
    config = JSON.parse(window.localStorage.getItem("config"));
}
loadConfig();
