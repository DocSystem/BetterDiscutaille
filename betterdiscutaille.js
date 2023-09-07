const TAGS = [
    {
        class: "bot",
        value: "BOT",
        admin: false
    },
    {
        class: "system",
        value: "SYSTÈME",
        admin: true
    }
]

const TRUST_STATE = {
    REPLAY_ATTACK: 104,
    TIMEOUT: 103,
    KEY_INVALID: 102,
    NO_KEY: 101,
    KEY_UNTRUSTED: 100,
    KEY_TRUSTED: 0
}

const VERIFIED_ICON = {
    104: `<svg viewBox="0 0 512 512" style="width: 14px; height: 14px; fill: #ff0000"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>`,
    103: `<svg viewBox="0 0 384 512" style="width: 14px; height: 14px; fill: #cb500e"><path d="M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64V75c0 42.4 16.9 83.1 46.9 113.1L146.7 256 78.9 323.9C48.9 353.9 32 394.6 32 437v11c-17.7 0-32 14.3-32 32s14.3 32 32 32H64 320h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V437c0-42.4-16.9-83.1-46.9-113.1L237.3 256l67.9-67.9c30-30 46.9-70.7 46.9-113.1V64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320 64 32zM96 75V64H288V75c0 25.5-10.1 49.9-28.1 67.9L192 210.7l-67.9-67.9C106.1 124.9 96 100.4 96 75z"/></svg>`,
    102: `<svg viewBox="0 0 512 512" style="width: 14px; height: 14px; fill: #ff0000"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>`,
    101: ``,
    100: `<svg viewBox="0 0 512 512" style="width: 14px; height: 14px; fill: #ffcc00"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>`,
    0: `<svg viewBox="0 0 512 512" style="width: 14px; height: 14px; fill: #3f7b5d"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`
};

let alreadySentSignatures = [];

function saveKnownUser(pseudo, status) {
    let user = config.known_users.find(u => u.pseudo === pseudo);
    if (user === undefined) {
        user = {
            pseudo: pseudo,
            statuses: []
        };
        config.known_users.push(user);
    }
    if (!user.statuses.includes(status)) {
        user.statuses.push(status);
    }
}

function parseMessageData(msg) {
    if (msg.length < 2) return {msg: msg, data: null};
    const isFromExtension = msg.charCodeAt(0) === CHAR_TABLE[0].charCodeAt(0) && msg.charCodeAt(1) === CHAR_TABLE[0].charCodeAt(0) && msg.charCodeAt(2) === CHAR_TABLE[0].charCodeAt(0);
    if (!isFromExtension) return {msg: msg, data: null};
    const message_data = unhideJSON(msg.split("").filter(c => CHAR_TABLE.includes(c)).join("").slice(3));
    return {
        msg: msg.split("").filter(c => !CHAR_TABLE.includes(c)).join(""),
        data: message_data
    }
}

async function verifyMessageSignature(msg, data, pseudo) {
    const key_hash = await hash(data.publicKey.n);

    // verify that the signature is valid
    if (await checkValidSignature(`${msg}-${pseudo}-${data.timestamp}`, data.signature, await getPublicKey(data.publicKey))) {
        // verify that the message isn't too old
        if (data.timestamp < new Date().getTime() - 1000 * 2) return TRUST_STATE.TIMEOUT;

        // verify that the message wasn't already sent
        if (alreadySentSignatures.includes(data.signature)) {
            return TRUST_STATE.REPLAY_ATTACK;
        }
        else {
            alreadySentSignatures.push(data.signature);
            setTimeout(() => {
                alreadySentSignatures = alreadySentSignatures.filter(s => s !== data.signature);
            }, 1000 * 2);
        }

        // verify that the key is trusted and that the pseudo is correct
        const trusted_user = config.trusted_users.find(u => u.key_hash === key_hash && u.pseudo === pseudo);
        return (trusted_user !== undefined) ? TRUST_STATE.KEY_TRUSTED : TRUST_STATE.KEY_UNTRUSTED;
    }
    else {
        // message was altered
        return TRUST_STATE.KEY_INVALID;
    }
}

async function parseMessage(message, pseudo) {
    let {msg, data} = parseMessageData(message);
    let verified = TRUST_STATE.NO_KEY;
    let key_hash = null;
    if (data) {
        if (data.dataType === "signedMessage") {
            verified = await verifyMessageSignature(msg, data, pseudo);
            key_hash = await hash(data.publicKey.n);
        }
    }
    const mentions = [];
    for (let i in msg) {
        const char = msg.charAt(i);
        if (char === "@") {
            // detect mentions
            const mentionable = [];
            // detect pseudo from known users (config.known_users.map(u => u.pseudo)) even when the pseudo contains spaces
            for (let u of config.known_users) {
                const pseudodata = parseSmallPseudo(u.pseudo);
                const p = pseudodata.withoutTags;
                const d = msg.slice(parseInt(i) + 1, parseInt(i) + p.length + 1);
                if (d === p) {
                    mentionable.push(p);
                }
            }
            if (mentionable.length > 0) {
                const pseudo = mentionable.sort((a, b) => b.length - a.length)[0];
                mentions.push({
                    pseudo: pseudo,
                    index: parseInt(i)
                });
            }
        }
    }

    for (let mention of mentions.sort((a, b) => b.index - a.index)) {
        const pseudo = mention.pseudo;
        const index = mention.index;
        msg = msg.slice(0, index) + `<span class="mention">@${pseudo}</span>` + msg.slice(index + pseudo.length + 1);
    }

    if (mentions.map(m => m.pseudo).includes(config.pseudo)) {
        msg = `<span class="mentioned-message">${msg}</span>`;
    }
    else {
        msg = `<span class="normal-message">${msg}</span>`;
    }

    return {msg: msg, verified: verified, key_hash: key_hash, data: data};
}

async function verifiedIconClickHandler(elem) {
    const keyHash = elem.getAttribute("data-key-hash");
    const pseudo = elem.getAttribute("data-pseudo");
    const verificationState = parseInt(elem.getAttribute("data-verification-state"));
    if (verificationState === TRUST_STATE.KEY_UNTRUSTED) {
        if (await showBooleanPopup("Confirmation", `Voulez-vous vraiment faire confiance à <b>${pseudo}</b> ?`)) {
            if (config.trusted_users.find(u => u.key_hash === keyHash && u.pseudo === pseudo) !== undefined) return;
            config.trusted_users.push({
                key_hash: keyHash,
                pseudo: pseudo
            });
            document.querySelectorAll(`.verified-icon[data-key-hash="${keyHash}"][data-pseudo="${pseudo}"][data-verification-state="${TRUST_STATE.KEY_UNTRUSTED}"]`).forEach(e => {
                e.innerHTML = VERIFIED_ICON[TRUST_STATE.KEY_TRUSTED];
                e.setAttribute("data-verification-state", TRUST_STATE.KEY_TRUSTED);
            });
        }
    }
}

function verifiedIconHoverHandler(elem) {
    const keyHash = elem.getAttribute("data-key-hash");
    const smallKeyHash = keyHash.substring(0, 8);
    const pseudo = elem.getAttribute("data-pseudo");
    const verificationState = parseInt(elem.getAttribute("data-verification-state"));
    const timestamp = parseInt(elem.getAttribute("data-timestamp"));
    if (verificationState === TRUST_STATE.KEY_TRUSTED) {
        showTooltip(`Le message est signé par <b>${pseudo}</b><br>${smallKeyHash}`, elem.getBoundingClientRect().x, elem.getBoundingClientRect().y, "#579a76");
    } else if (verificationState === TRUST_STATE.KEY_UNTRUSTED) {
        showTooltip(`Le message est signé par <b>${pseudo}</b><br>${smallKeyHash}<br>Si vous lui faites confiance, enregistrez sa clé en cliquant sur l'icone jaune`, elem.getBoundingClientRect().x, elem.getBoundingClientRect().y, "#ffcc00");
    } else if (verificationState === TRUST_STATE.KEY_INVALID) {
        showTooltip(`La signature de ce message <b>ne correspond pas</b> à son contenu.<br>Le message ou le pseudo peuvent avoir été altérés`, elem.getBoundingClientRect().x, elem.getBoundingClientRect().y, "#ff0000");
    } else if (verificationState === TRUST_STATE.TIMEOUT) {
        showTooltip(`La signature du message a expiré.<br>Ce message à été signé par <b>${pseudo}</b> le ${new Date(timestamp).toLocaleDateString()} à ${new Date(timestamp).toLocaleTimeString()}`, elem.getBoundingClientRect().x, elem.getBoundingClientRect().y, "#ff0000");
    } else if (verificationState === TRUST_STATE.REPLAY_ATTACK) {
        showTooltip(`Ce message est une copie d'un message envoyé par <b>${pseudo}</b> le ${new Date(timestamp).toLocaleDateString()} à ${new Date(timestamp).toLocaleTimeString()}`, elem.getBoundingClientRect().x, elem.getBoundingClientRect().y, "#ff0000");
    }
}

function verifiedIconUnhoverHandler(elem) {
    hideTooltips();
}

function parsePseudo(pseudo, status, isAdmin, verificationState, keyHash, timestamp) {
    let parsedPseudo;
    if (status !== "") {
        parsedPseudo = `<span class="author-container"><span class="author-data"><span class="author-pseudo">${pseudo} ${verificationState !== TRUST_STATE.NO_KEY ? `<span class="verified-icon" data-key-hash="${keyHash}" data-pseudo="${pseudo}" data-verification-state="${verificationState}" data-timestamp="${timestamp}" onclick="verifiedIconClickHandler(this)" onmouseenter="verifiedIconHoverHandler(this)" onmouseleave="verifiedIconUnhoverHandler(this)">${VERIFIED_ICON[verificationState]}</span>` : ""}</span><span class="author-status">${status}</span></span></span>`;
    }
    else {
        parsedPseudo = `<span class="author-container"><span class="author-data"><span class="author-pseudo">${pseudo} ${verificationState !== TRUST_STATE.NO_KEY ? `<span class="verified-icon" data-key-hash="${keyHash}" data-pseudo="${pseudo}" data-verification-state="${verificationState}" data-timestamp="${timestamp}" onclick="verifiedIconClickHandler(this)" onmouseenter="verifiedIconHoverHandler(this)" onmouseleave="verifiedIconUnhoverHandler(this)">${VERIFIED_ICON[verificationState]}</span>` : ""}</span></span></span>`;
    }
    saveKnownUser(pseudo, status);
    for (let tag of TAGS) {
        if (pseudo.endsWith(tag.value)) {
            if (tag.admin && !isAdmin) {
                parsedPseudo = parsedPseudo.replace(tag.value, "");
            }
            else {
                parsedPseudo = parsedPseudo.replace(tag.value, `<span class="tag tag-${tag.class}">${tag.value}</span>`);
            }
        }
    }
    return parsedPseudo;
}

function parseSmallPseudo(text) {
    let parsedPseudo = text;
    let pseudoWithoutTags = text;
    for (let tag of TAGS) {
        if (parsedPseudo.endsWith(tag.value)) {
            parsedPseudo = parsedPseudo.replace(tag.value, `<span class="tag tag-${tag.class}">${tag.value}</span>`);
            pseudoWithoutTags = pseudoWithoutTags.replace(tag.value, "").trimEnd();
        }
    }
    return {fullPseudo: parsedPseudo, withoutTags: pseudoWithoutTags};
}

printMessage = async function(data) {
    const parsedMessage = await parseMessage(data.message, data.pseudo);
    data.message = formatter(parsedMessage.msg);
    data.pseudo = parsePseudo(data.pseudo, parsedMessage.data?.userStatus || "", data.isAdmin, parsedMessage.verified, parsedMessage.key_hash, parsedMessage.data?.timestamp || 0);
    if (data.pseudo === lastPseudo) {
        addToLastMessage(data.message);
    }
    else {
        document.getElementById("messagecontainer").innerHTML = '<div class="messages">' + data.pseudo + '<span class="normal-message">' + data.message + '</span></div>' + document.getElementById("messagecontainer").innerHTML;
        lastPseudo = data.pseudo;
    }
}

origSendPseudo = sendPseudo;
sendPseudo = function() {
    config.pseudo = document.getElementById("pseudoInput").value;
    config.status = document.getElementById("statusInput").value;
    document.getElementById("pseudo").value = document.getElementById("pseudoInput").value;
    origSendPseudo();
}

origSendMessage = sendMessage;
sendMessage = async function() {
    if (document.getElementById("textinput").value.length === 0) return;
    const s = CHAR_TABLE[0];
    const ts = new Date().getTime();
    if (config.settings.sign_messages) {
        document.getElementById("textinput").value = s + s + s + document.getElementById("textinput").value + hideJSON({
            dataType: "signedMessage",
            signature: await getMessageSignature(`${document.getElementById("textinput").value}-${escapeHtml(config.pseudo)}-${ts}`),
            timestamp: ts,
            publicKey: config.personal_key.publicKey,
            userStatus: config.status
        });
    }
    else {
        document.getElementById("textinput").value = s + s + s + document.getElementById("textinput").value + hideJSON({
            dataType: "message",
            userStatus: config.status
        });
    }
    await origSendMessage();
}

const pseudoContainer = document.querySelector(".topbar > .flexrows:first-of-type");
pseudoContainer.className = "flexcolumns";
pseudoContainer.innerHTML = `
    <input type="hidden" id="pseudo">
    <div class="flexrows">
        <p>Pseudo: </p>
        <input type="text" placeholder="Pseudo" id="pseudoInput" value="${config.pseudo}" onchange="sendPseudo();">
    </div>
    <div class="flexrows">
        <p>Statut: </p>
        <input type="text" placeholder="Statut" id="statusInput" value="${config.status}" onchange="sendPseudo();">
    </div>
`;
document.getElementById("pseudo").value = config.pseudo + (config.status !== "" ? " | " + config.status : "");

let isPseudoListShown = false;

function showPseudoList(list) {
    isPseudoListShown = true;
    let pseudoList;
    if (document.querySelector(".pseudo-list")) {
        pseudoList = document.querySelector(".pseudo-list");
    }
    else {
        pseudoList = document.createElement("div");
        pseudoList.className = "pseudo-list";
        document.querySelector(".inputdiv").appendChild(pseudoList);
    }
    pseudoList.innerHTML = "";
    for (let pseudo of list) {
        const pseudodata = parseSmallPseudo(pseudo);
        const pseudoElement = document.createElement("div");
        pseudoElement.className = "pseudo-element";
        pseudoElement.innerHTML = pseudodata.fullPseudo;
        pseudoElement.setAttribute("data-pseudo", pseudodata.withoutTags)
        pseudoElement.onclick = function() {
            const text = document.getElementById("textinput").value;
            const lastWord = text.split(" ")[text.split(" ").length - 1];
            const newText = text.slice(0, text.length - lastWord.length) + "@" + pseudodata.withoutTags + " ";
            document.getElementById("textinput").value = newText;
            document.getElementById("textinput").focus();
            hidePseudoList();
        }
        pseudoElement.onmouseenter = function() {
            document.querySelector(".pseudo-list .selected").classList.remove("selected");
            pseudoElement.classList.add("selected");
        }
        pseudoList.appendChild(pseudoElement);
    }
    pseudoList.firstElementChild.classList.add("selected");
}

function hidePseudoList() {
    isPseudoListShown = false;
    if (document.querySelector(".pseudo-list")) {
        document.querySelector(".pseudo-list").remove();
    }
}

document.getElementById("textinput").addEventListener("keydown", function(e) {
    if (isPseudoListShown) {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const selected = document.querySelector(".pseudo-list .selected");
            if (selected.previousElementSibling) {
                selected.previousElementSibling.classList.add("selected");
                selected.classList.remove("selected");
            }
        }
        else if (e.key === "ArrowDown") {
            e.preventDefault();
            const selected = document.querySelector(".pseudo-list .selected");
            if (selected.nextElementSibling) {
                selected.nextElementSibling.classList.add("selected");
                selected.classList.remove("selected");
            }
        }
        else if (e.key === "Enter") {
            e.preventDefault();
            const selected = document.querySelector(".pseudo-list .selected");
            const text = document.getElementById("textinput").value;
            const lastWord = text.split(" ")[text.split(" ").length - 1];
            const newText = text.slice(0, text.length - lastWord.length) + "@" + selected.getAttribute("data-pseudo") + " ";
            document.getElementById("textinput").value = newText;
            document.getElementById("textinput").focus();
            hidePseudoList();
        }
    }
});

document.getElementById("textinput").addEventListener("keyup", function(e) {
    if (isPseudoListShown && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) return;
    // log new textinput value to console after each input (for debugging)
    let text = e.target.value;
    const lastWord = text.split(" ")[text.split(" ").length - 1];
    if (lastWord[0] === "@" && lastWord.length > 1) {
        const pseudo = lastWord.slice(1);
        const pseudoList = config.known_users.map(u => u.pseudo);
        const pseudoListFiltered = pseudoList.filter(p => p.toLowerCase().startsWith(pseudo.toLowerCase()));
        if (pseudoListFiltered.length > 0) {
            showPseudoList(pseudoListFiltered);
        }
    }
    else {
        hidePseudoList();
    }
});

async function bdInit() {


    while (socket.readyState !== 1) {
        await new Promise(r => setTimeout(r, 100));
    }
    sendPseudo();
    await printMessage({
        pseudo: "Better Discutaille SYSTÈME",
        message: CHAR_TABLE[0].repeat(3) + "Better Discutaille s'est chargé correctement !\nQue le chaos soit !" + hideHex(ascii2hex(JSON.stringify({
            userStatus: "Made with love by DocSystem"
        }))),
        isAdmin: true
    });
}

bdInit().then();
