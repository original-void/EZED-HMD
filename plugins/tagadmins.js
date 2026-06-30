module.exports = {
    name: "tagadmins",

    async execute({ sock, from }) {

        if (!from.endsWith("@g.us")) return;

        const metadata = await sock.groupMetadata(from);

        const admins = metadata.participants
            .filter(p => p.admin)
            .map(p => p.id);

        let text = "👑 *Group Admins*\n\n";

        admins.forEach(a=>{
            text += `@${a.split("@")[0]}\n`;
        });

        await sock.sendMessage(from,{
            text,
            mentions:admins
        });

    }
};
