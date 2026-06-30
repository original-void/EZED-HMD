module.exports = {
    name: "sticker",

    async execute({ sock, from, msg }) {

        const image =
            msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        if (!image) {
            return await sock.sendMessage(from, {
                text: "❌ Reply to an image with .sticker"
            });
        }

        await sock.sendMessage(from, {
            text: "🚧 Sticker feature is coming soon!"
        });

    }
};
