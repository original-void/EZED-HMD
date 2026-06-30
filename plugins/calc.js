module.exports = {
    name: "calc",

    async execute({ sock, from, args }) {

        if (!args.length) {
            return await sock.sendMessage(from, {
                text: "Example:\n.calc 25+10*2"
            });
        }

        try {

            const result = Function(`"use strict"; return (${args.join("")})`)();

            await sock.sendMessage(from, {
                text: `🧮 Result\n\n${result}`
            });

        } catch {

            await sock.sendMessage(from, {
                text: "❌ Invalid calculation."
            });

        }

    }
};
