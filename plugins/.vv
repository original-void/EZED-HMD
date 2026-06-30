const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "vv",
    description: "Reveal View Once media",

    async execute({ sock, from, msg }) {

        const quoted =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!quoted) {
            return await sock.sendMessage(from, {
                text: "❌ Reply to a View Once image or video."
            });
        }

        const viewOnce =
            quoted.viewOnceMessage?.message ||
            quoted.viewOnceMessageV2?.message;

        if (!viewOnce) {
            return await sock.sendMessage(from, {
                text: "❌ That message is not View Once."
            });
        }

        let media;
        let type;

        if (viewOnce.imageMessage) {
            media = viewOnce.imageMessage;
            type = "image";
        } else if (viewOnce.videoMessage) {
            media = viewOnce.videoMessage;
            type = "video";
        } else {
            return await sock.sendMessage(from, {
                text: "❌ Unsupported View Once media."
            });
        }

        try {

            const stream = await downloadContentFromMessage(media, type);

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (type === "image") {

                await sock.sendMessage(from, {
                    image: buffer,
                    caption: "👁️ View Once successfully revealed."
                });

            } else {

                await sock.sendMessage(from, {
                    video: buffer,
                    caption: "👁️ View Once successfully revealed."
                });

            }

        } catch (err) {

            console.log(err);

            await sock.sendMessage(from, {
                text: "❌ Failed to reveal the View Once media."
            });

        }

    }
              };
