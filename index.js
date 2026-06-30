const fs = require("fs");
const path = require("path");

const plugins = new Map();
const pluginPath = path.join(__dirname, "plugins");

fs.readdirSync(pluginPath).forEach(file => {
    if (!file.endsWith(".js")) return;

    const plugin = require(path.join(pluginPath, file));

    if (plugin.name) {
        plugins.set(plugin.name.toLowerCase(), plugin);
    }
});

console.log(`✅ Loaded ${plugins.size} plugins.`);

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const express = require("express");
const QRCode = require("qrcode");
const P = require("pino");

const config = require("./config");
const { loadDB } = require("./lib/database");
const { saveMessage, getMessage } = require("./lib/messageStore");
const { saveViewOnce, getViewOnce } = require("./lib/viewOnceStore");

const app = express();

let qrImage = "";
const startTime = Date.now();

function runtime() {
    const seconds = Math.floor((Date.now() - startTime) / 1000);

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${h}h ${m}m ${s}s`;
}

app.get("/", (req, res) => {

    if (!qrImage) {

        return res.send(`
        <center>
            <h1>${config.BOT_NAME}</h1>
            <h3>Waiting for QR Code...</h3>
        </center>
        `);

    }

    res.send(`
    <center>
        <h1>${config.BOT_NAME}</h1>
        <img src="${qrImage}" width="300">
        <br><br>
        <h3>Scan QR Using Linked Devices</h3>
    </center>
    `);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌍 Web Server Running On Port ${PORT}`);
});

async function startBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState("./session");

    const { version } =
        await fetchLatestBaileysVersion();

    const sock = makeWASocket({

        version,

        auth: state,

        logger: P({
            level: "silent"
        }),

        printQRInTerminal: true

    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({
        connection,
        qr,
        lastDisconnect
    }) => {

        if (qr) {

            qrImage = await QRCode.toDataURL(qr);

            console.log("📱 QR Generated");

        }

        if (connection === "open") {

            console.log(`✅ ${config.BOT_NAME} Connected`);

        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {

                console.log("♻️ Reconnecting...");

                startBot();

            }

        }

    });    // ==========================
    // MESSAGE HANDLER
    // ==========================

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];
        if (msg.key.remoteJid === "status@broadcast") {
    console.log("📢 STATUS DETECTED");
    console.log(JSON.stringify(msg, null, 2));
        }
        if (!msg?.message) return;

        if (msg.key.remoteJid === "status@broadcast") return;

        const from = msg.key.remoteJid;

        // Save message for AntiDelete
        saveMessage(msg);

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        const db = loadDB();

        // ==========================
        // SAVE VIEW ONCE
        // ==========================

        try {

            const viewOnce =
                msg.message?.viewOnceMessageV2?.message ||
                msg.message?.viewOnceMessage?.message ||
                msg.message?.viewOnceMessageV2Extension?.message;

            if (viewOnce) {

                let media;
                let type;

                if (viewOnce.imageMessage) {
                    media = viewOnce.imageMessage;
                    type = "image";
                }

                if (viewOnce.videoMessage) {
                    media = viewOnce.videoMessage;
                    type = "video";
                }

                if (media) {

                    const stream =
                        await downloadContentFromMessage(media, type);

                    let buffer = Buffer.alloc(0);

                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    saveViewOnce(msg.key.id, {
                        type,
                        buffer,
                        sender: msg.key.participant || from,
                        caption: media.caption || ""
                    });

                    console.log("👁️ View Once Cached");

                }

            }

        } catch (err) {

            console.log("ViewOnce Cache:", err.message);

        }

        // ==========================
        // ANTILINK
        // ==========================

        if (
            from.endsWith("@g.us") &&
            db.groups?.[from]?.antilink
        ) {

            const hasLink =
                body.includes("http://") ||
                body.includes("https://") ||
                body.includes("chat.whatsapp.com");

            if (hasLink) {

                try {

                    await sock.sendMessage(from, {
                        delete: msg.key
                    });

                    await sock.sendMessage(from, {
                        text: "🚫 Links are not allowed in this group."
                    });

                } catch (e) {
                    console.log(e);
                }

                return;
            }

        }

        // ==========================
        // COMMAND HANDLER
        // ==========================

        if (!body.startsWith(config.PREFIX)) return;

        const args = body
            .slice(config.PREFIX.length)
            .trim()
            .split(/ +/);

        const command = args.shift().toLowerCase();

        const plugin = plugins.get(command);

        if (!plugin) return;

        try {

            await plugin.execute({
                sock,
                msg,
                from,
                body,
                args,
                config,
                runtime
            });

        } catch (err) {

            console.error(err);

            await sock.sendMessage(from, {
                text: "❌ Error while executing command."
            });

        }

    });    // ==========================
    // ANTI DELETE
    // ==========================

    sock.ev.on("messages.update", async (updates) => {

        const db = loadDB();

        for (const update of updates) {

            const chat = update.key.remoteJid;

            if (
                !db.groups?.[chat]?.antidelete
            ) continue;

            // Check if message was deleted
            if (
                update.update?.message !== null &&
                update.update?.message !== undefined
            ) continue;

            const old = getMessage(update.key.id);
            if (!old) continue;

            try {

                const sender =
                    old.pushName ||
                    old.key.participant ||
                    "Unknown User";

                const time = new Date(
                    Number(old.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
                ).toLocaleString();

                const header =
`🚨 *ANTI DELETE*

👤 Sender: ${sender}
🕒 Time: ${time}

♻️ Recovered by ${config.BOT_NAME}`;

                // ======================
                // TEXT
                // ======================

                if (old.message.conversation) {

                    await sock.sendMessage(chat, {
                        text: `${header}\n\n💬 ${old.message.conversation}`
                    });

                    continue;
                }

                if (old.message.extendedTextMessage) {

                    await sock.sendMessage(chat, {
                        text: `${header}\n\n💬 ${old.message.extendedTextMessage.text}`
                    });

                    continue;
                }

                // ======================
                // IMAGE
                // ======================

                if (old.message.imageMessage) {

                    const buffer =
                        await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        image: buffer,
                        caption: header
                    });

                    continue;
                }

                // ======================
                // VIDEO
                // ======================

                if (old.message.videoMessage) {

                    const buffer =
                        await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        video: buffer,
                        caption: header
                    });

                    continue;
                }

                // ======================
                // AUDIO / VOICE NOTE
                // ======================

                if (old.message.audioMessage) {

                    const buffer =
                        await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        audio: buffer,
                        mimetype: old.message.audioMessage.mimetype,
                        ptt: old.message.audioMessage.ptt || false
                    });

                    continue;
                }

                // ======================
                // STICKER
                // ======================

                if (old.message.stickerMessage) {

                    const buffer =
                        await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        sticker: buffer
                    });

                    continue;
                }

                // ======================
                // DOCUMENT
                // ======================

                if (old.message.documentMessage) {

                    const buffer =
                        await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        document: buffer,
                        mimetype: old.message.documentMessage.mimetype,
                        fileName: old.message.documentMessage.fileName
                    });

                    continue;
                }

            } catch (err) {

                console.log("❌ AntiDelete Error:", err.message);

            }

        }

    });    // ==========================
    // BOT READY
    // ==========================

    console.log(`🚀 ${config.BOT_NAME} is ready and listening for messages.`);

} // End of startBot()

// ==========================
// START BOT
// ==========================

startBot().catch((err) => {
    console.error("❌ Failed to start bot:", err);

    // Retry after 5 seconds
    setTimeout(() => {
        startBot();
    }, 5000);
});

// ==========================
// PROCESS EVENTS
// ==========================

process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:");
    console.error(err);
});

process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:");
    console.error(reason);
});

process.on("SIGINT", () => {
    console.log("🛑 Bot stopped.");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("🛑 Process terminated.");
    process.exit(0);
});
