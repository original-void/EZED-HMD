module.exports = {
    name: "joke",

    async execute({ sock, from }) {

        const jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs! 😂",
            "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?' 😂",
            "There are 10 types of people: those who understand binary and those who don't. 😂",
            "Debugging: Being the detective in a crime movie where you're also the criminal. 😂",
            "Programming is 10% coding and 90% wondering why it doesn't work."
        ];

        const joke = jokes[Math.floor(Math.random() * jokes.length)];

        await sock.sendMessage(from, {
            text: "😂 *Joke*\n\n" + joke
        });

    }
};
