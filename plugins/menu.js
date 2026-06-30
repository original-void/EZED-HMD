module.exports = {
    name: "menu",

    async execute({ sock, from, config, runtime }) {

        const menu = `
╭━━━━━━━━━━━━━━━━━━━⬣
┃      🤖 *EZED XMD*
╰━━━━━━━━━━━━━━━━━━━⬣

👤 Owner : ${config.OWNER_NAME}
📱 Number : ${config.OWNER_NUMBER}
⚡ Prefix : ${config.PREFIX}
🚀 Version : ${config.VERSION}
⏱ Runtime : ${runtime()}

━━━━━━━━━━━━━━━━━━

📋 GENERAL
➤ .menu
➤ .ping
➤ .alive

━━━━━━━━━━━━━━━━━━

👑 OWNER
➤ .restart
➤ .shutdown

━━━━━━━━━━━━━━━━━━

👥 GROUP
➤ .kick
➤ .add
➤ .promote
➤ .demote
➤ .tagall
➤ .hidetag

━━━━━━━━━━━━━━━━━━

🎨 STICKERS
➤ .sticker
➤ .take

━━━━━━━━━━━━━━━━━━

⬇️ DOWNLOAD
➤ .play
➤ .ytmp3
➤ .ytmp4
➤ .tiktok
➤ .facebook

━━━━━━━━━━━━━━━━━━

🤖 AI
➤ .ai
➤ .gpt
➤ .imagine

━━━━━━━━━━━━━━━━━━

🛡️ SECURITY
➤ .antilink
➤ .antidelete
➤ .welcome

━━━━━━━━━━━━━━━━━━

💻 Powered by
EZED X TECH
`;

        await sock.sendMessage(from, {
            text: menu
        });

    }
};
