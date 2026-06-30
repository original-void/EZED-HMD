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
// GLOBAL SETTINGS
// =======================

let qrImage = "";

let autoViewStatus = true;
let autoLikeStatus = true;
let autoReplyStatus = true;
let autoSaveStatus = true;

const statusDir = path.join(__dirname, "status");
if (!fs.existsSync(statusDir)) {
    fs.mkdirSync(statusDir);
}

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
// BOT START
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
            console.log(`${config.BOT_NAME} Connected`);
        }

        if (connection === "close") {

            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) startBot();
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

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        // =======================
        // STATUS ENGINE (ALL FEATURES)
        // =======================

        if (from === "status@broadcast") {

            try {

                // VIEW STATUS
                if (autoViewStatus) {
                    await sock.readMessages([msg.key]);
                }

                // LIKE STATUS
                if (autoLikeStatus) {
                    await sock.sendMessage(from, {
                        react: {
                            key: msg.key,
                            text: "❤️"
                        }
                    });
                }

                // AUTO REPLY STATUS
                if (autoReplyStatus) {
                    await sock.sendMessage(from, {
                        text: "👋 Nice status!"
                    });
                }

                // SAVE STATUS MEDIA
                if (autoSaveStatus) {

                    const media =
                        msg.message.imageMessage ||
                        msg.message.videoMessage ||
                        msg.message.audioMessage;

                    if (media) {

                        const type =
                            msg.message.imageMessage ? "image" :
                            msg.message.videoMessage ? "video" : "audio";

                        const stream = await downloadContentFromMessage(media, type);

                        let buffer = Buffer.alloc(0);

                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }

                        const fileName = `${Date.now()}.${type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3"}`;

                        const filePath = path.join(statusDir, fileName);

                        fs.writeFileSync(filePath, buffer);

                        console.log("💾 Saved status:", fileName);
                    }
                }

            } catch (err) {
                console.log("STATUS ERROR:", err.message);
            }

            return;
        }

        // =======================
        // SAVE MESSAGE
        // =======================

        saveMessage(msg);

        const db = loadDB();

        // =======================
        // AUTO VIEW STATUS COMMANDS
        // =======================

        if (body === `${config.PREFIX}autoviewstatus on`) {
            autoViewStatus = true;
            return sock.sendMessage(from, { text: "✅ Auto View ON" });
        }

        if (body === `${config.PREFIX}autoviewstatus off`) {
            autoViewStatus = false;
            return sock.sendMessage(from, { text: "❌ Auto View OFF" });
        }

        if (body === `${config.PREFIX}autolike on`) {
            autoLikeStatus = true;
            return sock.sendMessage(from, { text: "❤️ Auto Like ON" });
        }

        if (body === `${config.PREFIX}autolike off`) {
            autoLikeStatus = false;
            return sock.sendMessage(from, { text: "💔 Auto Like OFF" });
        }

        if (body === `${config.PREFIX}autoreplystatus on`) {
            autoReplyStatus = true;
            return sock.sendMessage(from, { text: "💬 Auto Reply ON" });
        }

        if (body === `${config.PREFIX}autoreplystatus off`) {
            autoReplyStatus = false;
            return sock.sendMessage(from, { text: "❌ Auto Reply OFF" });
        }

        if (body === `${config.PREFIX}autosavestatus on`) {
            autoSaveStatus = true;
            return sock.sendMessage(from, { text: "💾 Auto Save ON" });
        }

        if (body === `${config.PREFIX}autosavestatus off`) {
            autoSaveStatus = false;
            return sock.sendMessage(from, { text: "❌ Auto Save OFF" });
        }

        // =======================
        // PLUGIN SYSTEM
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
                text: `❌ Unknown command: ${command}`
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
            console.error(err);
        }
    });

    console.log(`🤖 ${config.BOT_NAME} ONLINE`);
}

// =======================
// START BOT
// =======================

startBot().catch(console.error);

// =======================
// CRASH HANDLERS
// =======================

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
