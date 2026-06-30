module.exports = {
    name: "8ball",

    async execute({ sock, from, args }) {

        if (!args.length)
            return sock.sendMessage(from,{
                text:"Example:\n.8ball Will I become rich?"
            });

        const answers = [
            "Yes ✅",
            "No ❌",
            "Maybe 🤔",
            "Definitely 🔥",
            "Ask again later 😅",
            "Absolutely 💯",
            "Very unlikely 😅"
        ];

        const reply = answers[Math.floor(Math.random()*answers.length)];

        await sock.sendMessage(from,{
            text:`🎱 Question:\n${args.join(" ")}\n\nAnswer:\n${reply}`
        });

    }
};
