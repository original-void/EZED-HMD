async function checkGroupPermissions(sock, groupJid, sender) {
    const metadata = await sock.groupMetadata(groupJid);

    const participants = metadata.participants;

    const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

    const senderData = participants.find(p => p.id === sender);
    const botData = participants.find(p => p.id === botId);

    return {
        isAdmin: senderData?.admin !== null,
        isBotAdmin: botData?.admin !== null,
        metadata
    };
}

module.exports = {
    checkGroupPermissions
};
