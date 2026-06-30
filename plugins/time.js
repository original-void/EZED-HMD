module.exports = {
    name: "time",

    async execute({ sock, from }) {

        const time = new Date().toLocaleTimeString("en-KE", {
            timeZone: "Africa/Nairobi"
        });

        await sock.sendMessage(from, {
            text: `🕒 Current Kenya Time\n\n${time}`
        });

    }
};
