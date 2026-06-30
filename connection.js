const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: P({ level: "silent" })
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            console.log("🔥 EZED HMD BOT CONNECTED SUCCESSFULLY!");
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log("⚠️ EZED HMD disconnected. Reconnecting:", shouldReconnect);

            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const sender = msg.key.remoteJid;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text;

        console.log("📩 EZED HMD:", text);

        if (text === "hi") {
            await sock.sendMessage(sender, {
                text: "👋 Hello! I am *EZED HMD Bot*"
            });
        }

        if (text === "ping") {
            await sock.sendMessage(sender, {
                text: "🏓 pong from EZED HMD"
            });
        }

        if (text === "menu") {
            await sock.sendMessage(sender, {
                text:
`🤖 *EZED HMD MENU*

hi - greet bot
ping - test bot
menu - show menu`
            });
        }
    });
}

startBot();
