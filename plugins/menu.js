module.exports = {
    name: "menu",

    async execute({ sock, from, config }) {

        await sock.sendMessage(from, {
            text: `╭━━〔 🤖 ${config.BOT_NAME} 🤖 〕━━⬣

👤 GENERAL
• .ping
• .alive
• .menu

👥 GROUP
• .kick
• .add
• .promote
• .demote

👑 OWNER
• .restart
• .shutdown

━━━━━━━━━━━━━━━━━━`
        });

    }
};
