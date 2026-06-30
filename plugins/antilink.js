const { loadDB, saveDB } = require("../lib/database");

module.exports = {
    name: "antilink",

    async execute({ sock, from, args }) {

        if (!from.endsWith("@g.us")) {
            return;
        }

        const db = loadDB();

        if (!db.groups[from]) db.groups[from] = {};

        if (!args[0]) {
            return sock.sendMessage(from,{
                text:"Example:\n.antilink on\n.antilink off"
            });
        }

        db.groups[from].antilink =
            args[0].toLowerCase() === "on";

        saveDB(db);

        sock.sendMessage(from,{
            text:`🛡 AntiLink ${db.groups[from].antilink ? "Enabled" : "Disabled"}`
        });

    }
};
