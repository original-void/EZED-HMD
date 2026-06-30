const { loadDB, saveDB } = require("../lib/database");

module.exports = {
    name: "antidelete",
    description: "Enable or Disable Anti Delete",

    async execute({ sock, from, args }) {

        if (!from.endsWith("@g.us")) {
            return await sock.sendMessage(from, {
                text: "❌ This command can only be used in groups."
            });
        }

        const db = loadDB();

        if (!db.groups) db.groups = {};
        if (!db.groups[from]) db.groups[from] = {};

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text:
`╭━━〔 🗑️ ANTI DELETE 〕━━⬣

Usage:
.antidelete on
.antidelete off

╰━━━━━━━━━━━━━━━━━━⬣`
            });
        }

        const option = args[0].toLowerCase();

        if (option === "on") {

            db.groups[from].antidelete = true;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "✅ Anti Delete has been enabled."
            });

        }

        if (option === "off") {

            db.groups[from].antidelete = false;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "❌ Anti Delete has been disabled."
            });

        }

        return await sock.sendMessage(from, {
            text: "❌ Invalid option.\n\nUse:\n.antidelete on\n.antidelete off"
        });

    }
};
