module.exports = {
    name: "demote",

    async execute({ sock, from, msg }) {

        if (!from.endsWith("@g.us")) return;

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

        if (!mentioned || mentioned.length === 0) {
            return await sock.sendMessage(from, {
                text: "Tag a member.\nExample:\n.demote @user"
            });
        }

        await sock.groupParticipantsUpdate(
            from,
            mentioned,
            "demote"
        );

        await sock.sendMessage(from, {
            text: "✅ Member demoted."
        });

    }
};
