module.exports = {
    name: "runtime",

    async execute({ sock, from, runtime }) {

        await sock.sendMessage(from, {
            text: `⏱ Bot Runtime

${runtime()}`
        });

    }
};
