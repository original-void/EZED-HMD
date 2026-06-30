module.exports = {
    name: "owner",

    async execute({ sock, from, config }) {

        await sock.sendMessage(from, {
            text: `👑 *BOT OWNER*

Name : ${config.OWNER_NAME}
Number : ${config.OWNER_NUMBER}

Powered by EZED X TECH`
        });

    }
};
