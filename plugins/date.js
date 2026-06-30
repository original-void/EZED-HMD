module.exports = {
    name: "date",

    async execute({ sock, from }) {

        const date = new Date().toLocaleDateString("en-KE", {
            timeZone: "Africa/Nairobi",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        await sock.sendMessage(from, {
            text: `📅 Today\n\n${date}`
        });

    }
};
