module.exports = {
    name: "ping",
    description: "Check bot speed",

    async execute({ sock, from, config, runtime }) {
        const { performance } = require("perf_hooks");

        const start = performance.now();
        const end = performance.now();

        const speed = (end - start).toFixed(2);

        await sock.sendMessage(from, {
            text: `╭━━〔 ⚡ ${config.BOT_NAME} ⚡ 〕━━⬣

🤖 Status : Online ✅
⚡ Speed : ${speed} ms
⏱ Runtime : ${runtime()}

╰━━━━━━━━━━━━━━━━━━⬣`
        });
    }
};
