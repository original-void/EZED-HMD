const fs = require("fs");
const path = require("path");

const plugins = new Map();
const pluginPath = path.join(__dirname, "plugins");

fs.readdirSync(pluginPath).forEach(file => {
    if (!file.endsWith(".js")) return;

    const plugin = require(path.join(pluginPath, file));
    plugins.set(plugin.name.toLowerCase(), plugin);
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

const app = express();

let qrImage = "";
const startTime = Date.now();

function runtime() {
    const sec = Math.floor((Date.now() - startTime) / 1000);

    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    return `${h}h ${m}m ${s}s`;
}

// ==========================
// WEB SERVER
// ==========================

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
        <img src="${qrImage}" width="300"/>
        <br><br>
        <h3>Scan QR Using WhatsApp Linked Devices</h3>
    </center>
    `);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌐 ${config.BOT_NAME} Web Server Running on Port ${PORT}`);
});

// ==========================
// START BOT
// ==========================

async function startBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState("./session");

    const { version } =
        await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
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
            console.log("📱 QR Code Generated");
        }

        if (connection === "open") {
            console.log(`✅ ${config.BOT_NAME} Connected Successfully`);
        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log("❌ Connection Closed");

            if (shouldReconnect) {
                console.log("🔄 Reconnecting...");
                startBot();
            }

        }

    });    // ==========================
    // MESSAGE HANDLER
    // ==========================

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];
        if (!msg?.message) return;

        // Ignore status updates
        if (msg.key.remoteJid === "status@broadcast") return;

        // Save message for AntiDelete
        saveMessage(msg);

        const from = msg.key.remoteJid;

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        const db = loadDB();

        // ==========================
        // ANTI VIEW ONCE
        // ==========================

        if (
            from.endsWith("@g.us") &&
            db.groups?.[from]?.antiviewonce
        ) {

            const viewOnce =
                msg.message?.viewOnceMessageV2?.message ||
                msg.message?.viewOnceMessage?.message;

            if (viewOnce) {

                try {

                    const sender =
                        msg.pushName ||
                        msg.key.participant ||
                        "Unknown";

                    const caption =
`👁️ *ANTI VIEW ONCE*

👤 Sender: ${sender}

♻️ Recovered by ${config.BOT_NAME}`;

                    const mediaMsg = {
                        key: msg.key,
                        message: viewOnce
                    };

                    const buffer =
                        await sock.downloadMediaMessage(mediaMsg);

                    if (viewOnce.imageMessage) {

                        await sock.sendMessage(from, {
                            image: buffer,
                            caption
                        });

                    } else if (viewOnce.videoMessage) {

                        await sock.sendMessage(from, {
                            video: buffer,
                            caption
                        });

                    }

                } catch (err) {

                    console.log("AntiViewOnce Error:", err);

                }

            }

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

                await sock.sendMessage(from, {
                    delete: msg.key
                });

                await sock.sendMessage(from, {
                    text: "🚫 Links are not allowed in this group."
                });

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
                text: "❌ Error while executing the command."
            });

        }

    });    // ==========================
    // ANTI DELETE
    // ==========================

    sock.ev.on("messages.update", async (updates) => {

        const db = loadDB();

        for (const update of updates) {

            if (
                !update.update?.message ||
                update.update.message === null
            ) {

                const chat = update.key.remoteJid;

                if (!db.groups?.[chat]?.antidelete) continue;

                const old = getMessage(update.key.id);
                if (!old) continue;

                try {

                    const sender =
                        old.pushName ||
                        old.key.participant ||
                        "Unknown";

                    const time = new Date(
                        Number(old.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
                    ).toLocaleString();

                    const header =
`🚨 *ANTI DELETE DETECTED*

👤 Sender: ${sender}
🕒 Time: ${time}

♻️ Recovered by ${config.BOT_NAME}`;

                    // =====================
                    // TEXT
                    // =====================

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

                    // =====================
                    // IMAGE
                    // =====================

                    if (old.message.imageMessage) {

                        const buffer =
                            await sock.downloadMediaMessage(old);

                        await sock.sendMessage(chat, {
                            image: buffer,
                            caption: header
                        });

                        continue;
                    }

                    // =====================
                    // VIDEO
                    // =====================

                    if (old.message.videoMessage) {

                        const buffer =
                            await sock.downloadMediaMessage(old);

                        await sock.sendMessage(chat, {
                            video: buffer,
                            caption: header
                        });

                        continue;
                    }

                    // =====================
                    // AUDIO / VOICE NOTE
                    // =====================

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

                    // =====================
                    // STICKER
                    // =====================

                    if (old.message.stickerMessage) {

                        const buffer =
                            await sock.downloadMediaMessage(old);

                        await sock.sendMessage(chat, {
                            sticker: buffer
                        });

                        continue;
                    }

                    // =====================
                    // DOCUMENT
                    // =====================

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

                    console.error("AntiDelete Error:", err);

                }

            }

        }

    });    // ==========================
    // BOT READY
    // ==========================

    console.log(`🚀 ${config.BOT_NAME} is now listening for messages...`);

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
// UNCAUGHT ERROR HANDLERS
// ==========================

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
