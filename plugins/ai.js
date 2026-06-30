const { askAI } = require("../lib/ai");

module.exports = {
    name: "ai",

    async execute({ sock, from, args }) {

        if (!args.length) {
            return await sock.sendMessage(from, {
                text: "Example:\n.ai What is JavaScript?"
            });
        }

        const prompt = args.join(" ");

        try {

            const reply = await askAI(prompt);

            await sock.sendMessage(from, {
                text: `🤖 *EZED XMD AI*\n\n${reply}`
            });

        } catch (err) {
    console.error(err);

    await sock.sendMessage(from, {
        text: `❌ AI Error:\n${err.message}`
    });
        }
    }
};
