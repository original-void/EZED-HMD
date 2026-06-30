const { loadDB, saveDB } = require("../lib/database");

module.exports = {
    name: "autoviewstatus",
    description: "Enable or Disable Auto View Status",

    async execute({ sock, from, args }) {

        const db = loadDB();

        if (!db.settings) db.settings = {};

        if (!args[0]) {
            return await sock.sendMessage(from, {
                text:
`👀 *AUTO VIEW STATUS*

Usage:

.autoviewstatus on
.autoviewstatus off`
            });
        }

        if (args[0].toLowerCase() === "on") {

            db.settings.autoviewstatus = true;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "✅ Auto View Status Enabled."
            });

        }

        if (args[0].toLowerCase() === "off") {

            db.settings.autoviewstatus = false;
            saveDB(db);

            return await sock.sendMessage(from, {
                text: "❌ Auto View Status Disabled."
            });

        }

    }
};
