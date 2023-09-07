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

function arrayBuffer2b64(buffer) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function b642arrayBuffer(base64) {
    let binaryString = atob(base64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
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

function hideHex(hexx) {
    const hexString = hexx.toString(16);
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
    return hex;
}

function hideJSON(jsonObj) {
    return hideHex(ascii2hex(JSON.stringify(jsonObj)));
}

function unhideJSON(hidden) {
    return JSON.parse(hex2ascii(unhideHex(hidden)));
}
