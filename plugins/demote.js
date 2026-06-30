const { checkGroupPermissions } = require("../lib/permissions");
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
            "demote"
        );

        await sock.sendMessage(from, {
            text: "✅ Member demoted."
        });

    }
};
