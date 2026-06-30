module.exports = {
    name: "tagall",

    async execute({ sock, from, msg }) {

        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, {
                text: "❌ This command only works in groups."
            });
        }

        const metadata = await sock.groupMetadata(from);

        const participants = metadata.participants;

        let text = `📢 *TAG ALL*\n\n`;

        let mentions = [];

        for (let member of participants) {

            mentions.push(member.id);

            text += `➤ @${member.id.split("@")[0]}\n`;
        }

        await sock.sendMessage(from, {
            text,
            mentions
        });

    }
};
