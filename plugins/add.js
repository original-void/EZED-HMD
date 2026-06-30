const { checkGroupPermissions } = require("../lib/permissions");
module.exports = {
    name: "add",

    async execute({ sock, from, args }) {

        if (!from.endsWith("@g.us")) return;

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text: "Example:\n.add 254712345678"
            });
        }

        const number = args[0].replace(/\D/g, "") + "@s.whatsapp.net";
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
            [number],
            "add"
        );

        await sock.sendMessage(from, {
            text: "✅ Member added."
        });

    }
};
