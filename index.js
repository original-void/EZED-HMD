const fs = require("fs");
const path = require("path");

const plugins = new Map();

const pluginPath = path.join(__dirname, "plugins");

fs.readdirSync(pluginPath).forEach(file => {
    if (!file.endsWith(".js")) return;
    const plugin = require(path.join(pluginPath, file));
    plugins.set(plugin.name.toLowerCase(), plugin);
});

console.log(`Loaded ${plugins.size} plugins.`);

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const express = require("express");
const QRCode = require("qrcode");
const P = require("pino");
const { performance } = require("perf_hooks");
const config = require("./config");

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
        <h3>Waiting for QR Code...</h3>
        </center>
        `);
    }
    res.send(`
    <center>
        <h1>${config.BOT_NAME}</h1>
        <img src="${qrImage}" width="300"/>
        <br>
        <h3>Scan QR using WhatsApp Linked Devices</h3>
    </center>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`${config.BOT_NAME} Web Server Running`);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
        if (qr) {
            qrImage = await QRCode.toDataURL(qr);
            console.log("QR Code Generated");
        }
        if (connection === "open") {
            console.log(`${config.BOT_NAME} Connected Successfully`);
        }
        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        const body =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

        // ===== ANTILINK START =====
        const { loadDB } = require("./lib/database");
        const db = loadDB();

        if (
            from.endsWith("@g.us") &&
            db.groups[from]?.antilink
        ) {
            if (
                body.includes("https://") ||
                body.includes("http://") ||
                body.includes("chat.whatsapp.com")
            ) {
                // Delete the link message
                await sock.sendMessage(from, { delete: msg.key });

                // Warn the group
                await sock.sendMessage(from,{
                    text:"🚫 Links are not allowed in this group."
                });
                return; // stop here
            }
        }
        // ===== ANTILINK END =====

        if (!body.startsWith(config.PREFIX)) return;

        const args = body.slice(config.PREFIX.length).trim().split(/ +/);
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
                text: "❌ An error occurred while executing the command."
            });
        }
    });
}

startBot();
