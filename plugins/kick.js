module.exports = {
    name: "kick",

    async execute({ sock, from, msg }) {

        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, {
                text: "❌ This command can only be used in groups."
            });
        }

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;

        if (!mentioned || mentioned.length === 0) {
            return await sock.sendMessage(from, {
                text: "❌ Tag the member you want to remove.\nExample:\n.kick @user"
            });
        }

        await sock.groupParticipantsUpdate(
            from,
            mentioned,
            "remove"
        );

        await sock.sendMessage(from, {
            text: "✅ Member removed successfully."
        });

    }
};
