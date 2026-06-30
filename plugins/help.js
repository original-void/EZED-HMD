module.exports = {
    name: "help",

    async execute({ sock, from }) {

        await sock.sendMessage(from, {
            text: `🤖 EZED XMD Help

Use:

.menu

to see all available commands.

Need support?

Owner:
EZED X TECH`
        });

    }
};
