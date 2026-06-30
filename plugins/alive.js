module.exports = {
    name: "alive",

    async execute({ sock, from, config, runtime }) {

        await sock.sendMessage(from, {
            text: `🤖 ${config.BOT_NAME}

✅ Bot is Running

👤 Owner : ${config.OWNER_NAME}
⏱ Runtime : ${runtime()}
🚀 Version : ${config.VERSION}`
        });

    }
};
