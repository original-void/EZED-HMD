const fs = require("fs");
const path = require("path");
const express = require("express");
const QRCode = require("qrcode");
const P = require("pino");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const config = require("./config");

const { loadDB } = require("./lib/database");
const { saveMessage, getMessage } = require("./lib/messageStore");
const { saveViewOnce } = require("./lib/viewOnceStore");

// =======================
// LOAD PLUGINS
// =======================

const plugins = new Map();
const pluginPath = path.join(__dirname, "plugins");

function loadPlugins() {

    plugins.clear();

    if (!fs.existsSync(pluginPath)) {
        console.log("Plugins folder not found.");
        return;
    }

    const files = fs.readdirSync(pluginPath);

    for (const file of files) {

        if (!file.endsWith(".js")) continue;

        const filePath = path.join(pluginPath, file);

        try {

            delete require.cache[require.resolve(filePath)];

            const plugin = require(filePath);

            if (!plugin.name || typeof plugin.execute !== "function") {

                console.log(`Invalid Plugin: ${file}`);
                continue;

            }

            plugins.set(plugin.name.toLowerCase(), plugin);

        } catch (err) {

            console.log(`Failed loading ${file}`);
            console.error(err);

        }

    }

    console.log(`Loaded ${plugins.size} plugins.`);

}

loadPlugins();

// =======================
// EXPRESS SERVER
// =======================

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

app.get("/", (req, res) => {

    if (!qrImage) {

        return res.send(`
        <center>
            <h1>${config.BOT_NAME}</h1>
            <h3>Waiting For QR Code...</h3>
        </center>
        `);

    }

    res.send(`
    <center>
        <h1>${config.BOT_NAME}</h1>
        <img src="${qrImage}" width="300">
        <br><br>
        <h3>Scan Using WhatsApp Linked Devices</h3>
    </center>
    `);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Web Server Running On Port ${PORT}`);

});

// =======================
// START BOT
// =======================

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

            console.log("QR Generated");

        }

        if (connection === "open") {

            console.log(`${config.BOT_NAME} Connected Successfully`);

        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log("Connection Closed");

            if (shouldReconnect) {

                console.log("Reconnecting...");

                startBot();

            }

        }

    });    // =======================
    // MESSAGE HANDLER
    // =======================

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];

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

        // =======================
        // CACHE VIEW ONCE
        // =======================

        try {

            const viewOnce =
                msg.message?.viewOnceMessage?.message ||
                msg.message?.viewOnceMessageV2?.message ||
                msg.message?.viewOnceMessageV2Extension?.message;

            if (viewOnce) {

                let media = null;
                let type = null;

                if (viewOnce.imageMessage) {
                    media = viewOnce.imageMessage;
                    type = "image";
                } else if (viewOnce.videoMessage) {
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

            console.log("ViewOnce Error:", err.message);

        }

        // =======================
        // ANTILINK
        // =======================

        if (
            from.endsWith("@g.us") &&
            db.groups?.[from]?.antilink
        ) {

            const hasLink =
                body.includes("https://") ||
                body.includes("http://") ||
                body.includes("chat.whatsapp.com");

            if (hasLink) {

                try {

                    await sock.sendMessage(from, {
                        delete: msg.key
                    });

                    await sock.sendMessage(from, {
                        text: "🚫 Links are not allowed in this group."
                    });

                } catch (err) {

                    console.log(err);

                }

                return;

            }

        }

        // =======================
        // COMMAND HANDLER
        // =======================

        if (!body.startsWith(config.PREFIX)) return;

        const args = body
            .slice(config.PREFIX.length)
            .trim()
            .split(/ +/);

        const command = args.shift().toLowerCase();

        const plugin = plugins.get(command);

        if (!plugin) {

            return await sock.sendMessage(from, {
                text: `❌ Unknown command: ${command}\n\nUse ${config.PREFIX}menu to view all commands.`
            });

        }

        console.log(`[COMMAND] ${command} | ${from}`);

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

    console.log(`✅ ${command} executed successfully.`);

} catch (err) {

    console.error(`Plugin Error (${command})`);
    console.error(err);

    await sock.sendMessage(from,{
        text:
`❌ An error occurred while running *${command}*.`
    });

        }

    });    // =======================
    // ANTI DELETE
    // =======================

    sock.ev.on("messages.update", async (updates) => {

        const db = loadDB();

        for (const update of updates) {

            const chat = update.key.remoteJid;

            if (!db.groups?.[chat]?.antidelete) continue;

            // Ignore non-delete updates
            if (
                update.update?.message !== undefined &&
                update.update?.message !== null
            ) continue;

            const old = getMessage(update.key.id);

            if (!old) continue;

            try {

                const sender =
                    old.pushName ||
                    old.key.participant ||
                    old.key.remoteJid ||
                    "Unknown";

                const time = new Date(
                    Number(old.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000
                ).toLocaleString();

                const header =
`🚨 *ANTI DELETE DETECTED*

👤 Sender : ${sender}
🕒 Time   : ${time}

♻️ Recovered by ${config.BOT_NAME}`;

                // =======================
                // TEXT
                // =======================

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

                // =======================
                // IMAGE
                // =======================

                if (old.message.imageMessage) {

                    const buffer = await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        image: buffer,
                        caption: header
                    });

                    continue;

                }

                // =======================
                // VIDEO
                // =======================

                if (old.message.videoMessage) {

                    const buffer = await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        video: buffer,
                        caption: header
                    });

                    continue;

                }

                // =======================
                // AUDIO / VOICE NOTE
                // =======================

                if (old.message.audioMessage) {

                    const buffer = await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        audio: buffer,
                        mimetype: old.message.audioMessage.mimetype,
                        ptt: old.message.audioMessage.ptt || false
                    });

                    continue;

                }

                // =======================
                // STICKER
                // =======================

                if (old.message.stickerMessage) {

                    const buffer = await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        sticker: buffer
                    });

                    continue;

                }

                // =======================
                // DOCUMENT
                // =======================

                if (old.message.documentMessage) {

                    const buffer = await sock.downloadMediaMessage(old);

                    await sock.sendMessage(chat, {
                        document: buffer,
                        mimetype: old.message.documentMessage.mimetype,
                        fileName: old.message.documentMessage.fileName
                    });

                    continue;

                }

                // =======================
                // CONTACT
                // =======================

                if (old.message.contactMessage) {

                    await sock.sendMessage(chat, {
                        contacts: {
                            displayName: old.message.contactMessage.displayName,
                            contacts: [old.message.contactMessage]
                        }
                    });

                    continue;

                }

                // =======================
                // LOCATION
                // =======================

                if (old.message.locationMessage) {

                    await sock.sendMessage(chat, {
                        location: {
                            degreesLatitude: old.message.locationMessage.degreesLatitude,
                            degreesLongitude: old.message.locationMessage.degreesLongitude
                        }
                    });

                    continue;

                }

            } catch (err) {

                console.log("❌ AntiDelete Error:", err.message);

            }

        }

    });    // =======================
    // BOT READY
    // =======================

    console.log(`🤖 ${config.BOT_NAME} is now online.`);

} // END startBot()

// =======================
// START BOT
// =======================

startBot().catch(err => {

    console.error("❌ Failed to start bot:");
    console.error(err);

    setTimeout(() => {

        console.log("🔄 Restarting bot...");

        startBot();

    }, 5000);

});

// =======================
// AUTO RESTART ON CRASH
// =======================

process.on("uncaughtException", (err) => {

    console.log("══════════════════════════════");
    console.log("❌ UNCAUGHT EXCEPTION");
    console.error(err);
    console.log("══════════════════════════════");

});

process.on("unhandledRejection", (reason) => {

    console.log("══════════════════════════════");
    console.log("❌ UNHANDLED REJECTION");
    console.error(reason);
    console.log("══════════════════════════════");

});

// =======================
// SHUTDOWN
// =======================

process.on("SIGINT", () => {

    console.log("🛑 Stopping EZED XMD...");
    process.exit(0);

});

process.on("SIGTERM", () => {

    console.log("🛑 Process Terminated.");
    process.exit(0);

});
