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
// GLOBALS
// =======================

let qrImage = "";
let autoViewStatus = true;

const startTime = Date.now();

function runtime() {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
}

// =======================
// EXPRESS SERVER
// =======================

const app = express();

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
        <img src="${qrImage}" width="300"/>
        <h3>Scan Using WhatsApp Linked Devices</h3>
    </center>
    `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Web Server Running On Port ${PORT}`);
});

// =======================
// PLUGINS
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
        logger: P({ level: "silent" }),
        printQRInTerminal: true,
        markOnlineOnConnect: true

    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {

        if (qr) {
            qrImage = await QRCode.toDataURL(qr);
            console.log("QR Generated");
        }

        if (connection === "open") {
            console.log(`${config.BOT_NAME} Connected Successfully`);
        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("Connection Closed");

            if (shouldReconnect) {
                console.log("Reconnecting...");
                startBot();
            }
        }
    });

    // =======================
    // MESSAGE HANDLER
    // =======================

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];
        console.log("Remote JID:", msg.key.remoteJid);

        if (!msg?.message) return;

        const from = msg.key.remoteJid;

        // =======================
        // AUTO VIEW STATUS FIX
        // =======================

        if (autoViewStatus && from === "status@broadcast") {
            try {
                await sock.readMessages([msg.key]);
                console.log("👁️ Status viewed:", msg.key.participant || "unknown");
            } catch (err) {
                console.log("AutoViewStatus Error:", err.message);
            }
        }

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        // =======================
        // COMMANDS (AUTO VIEW TOGGLE)
        // =======================

        if (body === `${config.PREFIX}autoviewstatus on`) {
            autoViewStatus = true;
            return sock.sendMessage(from, {
                text: "✅ Auto View Status ENABLED"
            });
        }

        if (body === `${config.PREFIX}autoviewstatus off`) {
            autoViewStatus = false;
            return sock.sendMessage(from, {
                text: "❌ Auto View Status DISABLED"
            });
        }

        // Save message
        saveMessage(msg);

        const db = loadDB();

        // =======================
        // VIEW ONCE CACHE
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

                    const stream = await downloadContentFromMessage(media, type);

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

                    console.log("👁️ ViewOnce Cached");
                }
            }

        } catch (err) {
            console.log("ViewOnce Error:", err.message);
        }

        // =======================
        // ANTI LINK (BASIC)
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

                await sock.sendMessage(from, { delete: msg.key });

                await sock.sendMessage(from, {
                    text: "🚫 Links are not allowed in this group."
                });

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
            return sock.sendMessage(from, {
                text: `❌ Unknown command: ${command}\n\nUse ${config.PREFIX}menu`
            });
        }

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

            console.error("Plugin Error:", err);

            await sock.sendMessage(from, {
                text: `❌ Error running ${command}`
            });
        }
    });

    // =======================
    // ANTI DELETE
    // =======================

    sock.ev.on("messages.update", async (updates) => {

        const db = loadDB();

        for (const update of updates) {

            const chat = update.key.remoteJid;

            if (!db.groups?.[chat]?.antidelete) continue;

            if (update.update?.message) continue;

            const old = getMessage(update.key.id);
            if (!old) continue;

            try {

                const sender =
                    old.pushName ||
                    old.key.participant ||
                    "Unknown";

                const header =
`🚨 ANTI DELETE DETECTED

👤 Sender: ${sender}
🤖 Bot: ${config.BOT_NAME}`;

                if (old.message.conversation) {
                    await sock.sendMessage(chat, {
                        text: `${header}\n\n${old.message.conversation}`
                    });
                }

            } catch (err) {
                console.log("AntiDelete Error:", err.message);
            }
        }
    });

    console.log(`🤖 ${config.BOT_NAME} is now online.`);
}

// =======================
// START
// =======================

startBot().catch(err => {
    console.error("Failed:", err);
    setTimeout(startBot, 5000);
});

// =======================
// CRASH HANDLERS
// =======================

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
