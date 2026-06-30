// ============================
// ANTI VIEW ONCE
// ============================

const db = loadDB();

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

♻️ View Once recovered by ${config.BOT_NAME}`;

            if (viewOnce.imageMessage) {

                const mediaMsg = {
                    key: msg.key,
                    message: viewOnce
                };

                const buffer = await sock.downloadMediaMessage(mediaMsg);

                await sock.sendMessage(from, {
                    image: buffer,
                    caption
                });

            } else if (viewOnce.videoMessage) {

                const mediaMsg = {
                    key: msg.key,
                    message: viewOnce
                };

                const buffer = await sock.downloadMediaMessage(mediaMsg);

                await sock.sendMessage(from, {
                    video: buffer,
                    caption
                });

            }

        } catch (err) {
            console.error("AntiViewOnce:", err);
        }
    }
}
