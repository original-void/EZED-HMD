const { checkGroupPermissions } = require("../lib/permissions");
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
const sender = msg.key.participant || msg.key.remoteJid;

const { isAdmin, isBotAdmin } =
    await checkGroupPermissions(sock, from, sender);

if (!isAdmin) {
    return await sock.sendMessage(from, {
        text: "❌ Only group admins can use this command."
    });
}

if (!isBotAdmin) {
    return await sock.sendMessage(from, {
        text: "❌ I must be a group admin to do that."
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
