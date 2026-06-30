module.exports = {
    name: "hidetag",

    async execute({ sock, from, msg, args }) {

        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, {
                text: "❌ This command only works in groups."
            });
        }

        const metadata = await sock.groupMetadata(from);

        const mentions = metadata.participants.map(p => p.id);

        const text = args.length
            ? args.join(" ")
            : "📢 Hidden tag from EZED XMD";

        await sock.sendMessage(from, {
            text,
            mentions
        });

    }
};
