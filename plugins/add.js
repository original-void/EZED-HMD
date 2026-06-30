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
