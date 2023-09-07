async function hash(message) {
    const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); // convert bytes to hex string
    return hashHex;
}

function encodeMessage(message) {
    let enc = new TextEncoder();
    return enc.encode(message);
}

async function getMessageSignature(message) {
    let encoded = encodeMessage(message);
    let signature = await window.crypto.subtle.sign(
        {
            name: "RSA-PSS",
            saltLength: 32,
        },
        await getPrivateKey(config.personal_key.privateKey),
        encoded
    );
    return arrayBuffer2b64(signature);
}

async function checkValidSignature(message, signature, publicKey) {
    let encoded = encodeMessage(message);
    return await window.crypto.subtle.verify(
        {
            name: "RSA-PSS",
            saltLength: 32,
        },
        publicKey,
        b642arrayBuffer(signature),
        encoded
    );
}

function getPrivateKey(jwk) {
    return crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-PSS",
            hash: "SHA-256",
        },
        true,
        ["sign"]
    );
}

function getPublicKey(jwk) {
    return crypto.subtle.importKey(
        "jwk",
        jwk,
        {
            name: "RSA-PSS",
            hash: "SHA-256",
        },
        true,
        ["verify"]
    );
}

async function createKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-PSS",
            modulusLength: 2048,
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-256",
        },
        true,
        ["sign", "verify"]
    );
    // stocker la clé privée : await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    return {
        publicKey: publicKey,
        privateKey: privateKey
    }
}

(async () => {
    if (config.personal_key) return;
    console.log("[BETTER DISCUTAILLE] Generating RSA key pair...");
    config.personal_key = await createKeyPair();
    console.log("[BETTER DISCUTAILLE] RSA key pair generated.");
})();
