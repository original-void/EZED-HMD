module.exports = {
    name: "promote",

    async execute({ sock, from, msg }) {

        if (!from.endsWith("@g.us")) return;

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

        if (!mentioned || mentioned.length === 0) {
            return await sock.sendMessage(from, {
                text: "Tag a member.\nExample:\n.promote @user"
            });
        }

        await sock.groupParticipantsUpdate(
            from,
            mentioned,
            "promote"
        );

        await sock.sendMessage(from, {
            text: "✅ Member promoted to admin."
        });

    }
};
