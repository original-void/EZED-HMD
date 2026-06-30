const quotes = [
"Success comes to those who never give up.",
"Believe in yourself and keep pushing.",
"Every expert was once a beginner.",
"Dream big, work hard, stay humble.",
"Consistency beats talent."
];

module.exports = {
    name: "quote",

    async execute({ sock, from }) {

        const quote = quotes[Math.floor(Math.random() * quotes.length)];

        await sock.sendMessage(from, {
            text: `💡 *Quote of the Day*\n\n"${quote}"`
        });

    }
};
