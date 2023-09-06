function log(message) {
    console.log("[BETTER DISCUTAILLE] " + message);
}

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

const VERIFIED_ICON = `<svg viewBox="0 0 512 512" style="width: 14px; height: 14px; fill: #3f7b5d"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`;

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
    saveConfig();
}

function parseMessageData(msg) {
    if (msg.length < 2) return {msg: msg, data: null};;
    const isFromExtension = msg.charCodeAt(0) === CHAR_TABLE[0].charCodeAt(0) && msg.charCodeAt(1) === CHAR_TABLE[0].charCodeAt(0) && msg.charCodeAt(2) === CHAR_TABLE[0].charCodeAt(0);
    if (!isFromExtension) return {msg: msg, data: null};
    const message_data_hex = unhideHex(msg.split("").filter(c => CHAR_TABLE.includes(c)).join("").slice(3));
    const message_data = JSON.parse(hex2ascii(message_data_hex.toString(16), "hex"));
    return {
        msg: msg.split("").filter(c => !CHAR_TABLE.includes(c)).join(""),
        data: message_data
    }
}

async function verifyMessageSignature(message, pseudo) {
    const {msg, data} = parseMessageData(message);
    if (!data) return false;
    console.log(data);
    const signature = BigInt(data.signature);
    if (data.timestamp < new Date().getTime() - 1000 * 2) return false;
    return await checkValidSignature(`${msg}-${pseudo}-${data.timestamp}`, signature, BigInt(data.public_key));
}

function parseLinks(msg) {
    return msg.replaceAll(/(?<!href=")(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
}

async function parseMessage(msg, pseudo) {
    const verified = await verifyMessageSignature(msg, pseudo);
    msg = parseLinks(msg);
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

    return {msg: msg, verified: verified};
}

function parsePseudo(text, isAdmin, isVerified) {
    let pseudo;
    let status = "";
    let parsedPseudo;
    if (text.includes(" | ")) {
        pseudo = text.split(" | ")[0];
        status = text.split(" | ")[1];
        parsedPseudo = `<span class="author-container"><span class="author-data"><span class="author-pseudo">${pseudo}</span><span class="author-status">${status}</span></span></span>`;
    }
    else {
        pseudo = text;
        parsedPseudo = `<span class="author-container"><span class="author-data"><span class="author-pseudo">${pseudo} ${isVerified ? `<span class="verified">${VERIFIED_ICON}</span>` : ""}</span></span></span>`;
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
    data.message = parsedMessage.msg;
    data.pseudo = parsePseudo(data.pseudo, data.isAdmin, parsedMessage.verified);
    if (data.pseudo === lastPseudo) {
        addToLastMessage(data.message);
    }
    else {
        document.getElementById("messagecontainer").innerHTML = '<div class="messages">' + data.pseudo + '<br><span class="normal-message">' + data.message + '</span></div>' + document.getElementById("messagecontainer").innerHTML;
        lastPseudo = data.pseudo;
    }
}

origSendPseudo = sendPseudo;
sendPseudo = function() {
    config.pseudo = document.getElementById("pseudoInput").value;
    config.status = document.getElementById("statusInput").value;
    saveConfig();
    document.getElementById("pseudo").value = document.getElementById("pseudoInput").value + (document.getElementById("statusInput").value !== "" ? " | " + document.getElementById("statusInput").value : "");
    origSendPseudo();
}

origSendMessage = sendMessage;
sendMessage = async function() {
    const s = CHAR_TABLE[0];
    const ts = new Date().getTime();
    document.getElementById("textinput").value = s + s + s + document.getElementById("textinput").value + hideHex(ascii2hex(JSON.stringify({
        dataType: "signedMessage",
        signature: "0x" + (await getMessageSignature(`${document.getElementById("textinput").value}-${config.pseudo}-${ts}`)).toString(16),
        timestamp: ts,
        public_key: config.personal_key.n
    })));
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
        pseudo: "Better Discutaille SYSTÈME | Made with love by DocSystem",
        message: "Better Discutaille s'est chargé correctement !\nQue le chaos soit !",
        isAdmin: true
    });
}

bdInit().then();
