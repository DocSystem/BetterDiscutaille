async function hash(message) {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); // convert bytes to hex string
    return hashHex;
}

function hex2ascii(hexx) {
    let hex = hexx.toString();//force conversion
    let str = '';
    for (let i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function ascii2hex(str) {
    let hex = '';
    for(let i = 0; i < str.length; i++) {
        hex += '' + str.charCodeAt(i).toString(16);
    }
    return hex;
}

function b642bigint(b64) {
    b64 = b64.replace(/_/g, '/').replace(/-/g, '+');
    return BigInt("0x" + atob(b64).split("").map(c => c.charCodeAt(0).toString(16)).join(""));
}

const CHAR_TABLE = [
    "\u034f",
    "\u17b4",
    "\u17b5",
    "\u200c",
    "\u200d",
    "\u200e",
    "\u2060",
    "\u206a",
    "\u206b",
    "\u206c",
    "\u206d",
    "\u206e",
    "\u206f",
    "\ufeff",
    "\u2062",
    "\u2064"
];

function hideHex(bigint) {
    const hexString = bigint.toString(16);
    let hidden = "";
    for (let i = 0; i < hexString.length; i++) {
        hidden += CHAR_TABLE[parseInt(hexString.charAt(i), 16)];
    }
    return hidden;
}

function unhideHex(hiddenString) {
    let hex = "";
    for (let i = 0; i < hiddenString.length; i++) {
        hex += CHAR_TABLE.indexOf(hiddenString.charAt(i)).toString(16);
    }
    return BigInt("0x" + hex);
}

function modPow(base, exp, mod) {
    if (exp === 0n) return 1n;
    if (exp % 2n === 0n) return modPow(base * base % mod, exp / 2n, mod);
    return base * modPow(base, exp - 1n, mod) % mod;
}

async function getMessageSignature(msg) {
    const hex = msg.split("").map(c => c.charCodeAt(0).toString(16)).join("");
    const h = BigInt("0x" + await hash(hex));
    return modPow(h, BigInt(config.personal_key.d), BigInt(config.personal_key.n));
}

async function checkValidSignature(msg, signature, key_n) {
    const hex = msg.split("").map(c => c.charCodeAt(0).toString(16)).join("");
    const h = BigInt("0x" + await hash(hex));
    return modPow(signature, BigInt(config.personal_key.e), key_n) === h;
}

(async () => {
    if (config.personal_key) return;
    let keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
    );
    let exportedPublic = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    let d = b642bigint(exportedPublic["d"]);
    let n = b642bigint(exportedPublic["n"]);
    config.personal_key = {
        d: "0x" + d.toString(16),
        e: "0x" + 65537n.toString(16),
        n: "0x" + n.toString(16)
    }
    saveConfig();
})();
