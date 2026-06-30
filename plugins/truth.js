module.exports = {
    name: "truth",

    async execute({ sock, from }) {

        const truth = [
            "Who is your secret crush? ❤️",
            "What is your biggest fear? 😨",
            "Have you ever lied to your best friend? 🤭",
            "What's your biggest regret? 😅",
            "Who do you text the most? 📱"
        ];

        await sock.sendMessage(from,{
            text:"🤫 Truth\n\n"+truth[Math.floor(Math.random()*truth.length)]
        });

    }
};
