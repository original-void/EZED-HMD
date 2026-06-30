const { getViewOnce } = require("../lib/viewOnceStore");

module.exports = {
    name: "vv",
    description: "Reveal cached View Once media",

    async execute({ sock, from, msg }) {

        const quoted = msg.message?.extendedTextMessage?.contextInfo;

        if (!quoted?.stanzaId) {
            return await sock.sendMessage(from, {
                text: "❌ Reply to a View Once image or video with *.vv*"
            });
        }

        const media = getViewOnce(quoted.stanzaId);

        if (!media) {
            return await sock.sendMessage(from, {
                text:
`❌ View Once media not found.

Possible reasons:
• The media was sent before the bot was online.
• The cache expired.
• The bot couldn't save the media.`
            });
        }

        if (media.type === "image") {

            await sock.sendMessage(from, {
                image: media.buffer,
                caption:
`👁️ *VIEW ONCE OPENED*

👤 Sender: ${media.sender}

${media.caption || ""}`
            });

        } else {

            await sock.sendMessage(from, {
                video: media.buffer,
                caption:
`👁️ *VIEW ONCE OPENED*

👤 Sender: ${media.sender}

${media.caption || ""}`
            });

        }

    }
};
