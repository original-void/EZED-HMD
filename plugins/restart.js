module.exports = {
    name: "restart",

    async execute({ sock, from, msg, config }) {

        const sender = msg.key.participant || msg.key.remoteJid;
        const owner = config.OWNER_NUMBER + "@s.whatsapp.net";

        if (sender !== owner) {
            return await sock.sendMessage(from, {
                text: "❌ This command is for the bot owner only."
            });
        }

        await sock.sendMessage(from, {
            text: "♻️ Restarting EZED XMD..."
        });

        process.exit(0);
    }
};
