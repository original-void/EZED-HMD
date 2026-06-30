const { loadDB, saveDB } = require("../lib/database");

module.exports = {
    name: "welcome",

    async execute({ sock, from, args }) {

        if (!from.endsWith("@g.us")) {
            return sock.sendMessage(from, {
                text: "❌ Group command only."
            });
        }

        const db = loadDB();

        if (!db.groups[from]) db.groups[from] = {};

        if (!args[0]) {
            return sock.sendMessage(from, {
                text: "Example:\n.welcome on\n.welcome off"
            });
        }

        db.groups[from].welcome =
            args[0].toLowerCase() === "on";

        saveDB(db);

        await sock.sendMessage(from, {
            text: `✅ Welcome ${db.groups[from].welcome ? "Enabled" : "Disabled"}`
        });

    }
};
