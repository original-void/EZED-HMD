const { loadDB, saveDB } = require("../lib/database");

module.exports = {
    name: "antiviewonce",
    description: "Enable or Disable Anti View Once",

    async execute({ sock, from, args }) {

        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, {
                text: "❌ This command only works in groups."
            });
        }

        const db = loadDB();

        if (!db.groups) db.groups = {};
        if (!db.groups[from]) db.groups[from] = {};

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text:
`╭━━〔 👁️ ANTI VIEW ONCE 〕━━⬣

Usage:
.antiviewonce on
.antiviewonce off

╰━━━━━━━━━━━━━━━━━━⬣`
            });
        }

        const option = args[0].toLowerCase();

        if (option === "on") {

            db.groups[from].antiviewonce = true;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "✅ Anti View Once Enabled."
            });

        }

        if (option === "off") {

            db.groups[from].antiviewonce = false;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "❌ Anti View Once Disabled."
            });

        }

        return sock.sendMessage(from, {
            text: "Use:\n.antiviewonce on\n.antiviewonce off"
        });

    }
};
