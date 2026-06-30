const os = require("os");
const { performance } = require("perf_hooks");

module.exports = {
    name: "bot",

    async execute({ sock, from, config, runtime }) {

        const start = performance.now();
        const end = performance.now();

        const speed = (end - start).toFixed(2);

        const ram = (
            process.memoryUsage().heapUsed /
            1024 /
            1024
        ).toFixed(2);

        const totalRam = (
            os.totalmem() /
            1024 /
            1024 /
            1024
        ).toFixed(2);

        const freeRam = (
            os.freemem() /
            1024 /
            1024 /
            1024
        ).toFixed(2);

        const info = `
╭━━〔 🤖 EZED XMD INFO 〕━━⬣

👑 Owner : ${config.OWNER_NAME}
📱 Number : ${config.OWNER_NUMBER}

⚡ Speed : ${speed} ms
⏱ Runtime : ${runtime()}

🖥 Platform : ${os.platform()}
💻 Node.js : ${process.version}

💾 RAM Used : ${ram} MB
📦 Total RAM : ${totalRam} GB
🟢 Free RAM : ${freeRam} GB

🚀 Version : ${config.VERSION}

╰━━━━━━━━━━━━━━━━━━⬣
`;

        await sock.sendMessage(from, {
            text: info
        });

    }
};
