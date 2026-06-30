module.exports = {
    name: "dare",

    async execute({ sock, from }) {

        const dare = [
            "Sing your favorite song. 🎤",
            "Dance for 30 seconds. 💃",
            "Send your funniest selfie. 🤳",
            "Talk like a robot for 1 minute. 🤖",
            "Change your profile picture for one day. 😂"
        ];

        await sock.sendMessage(from,{
            text:"😈 Dare\n\n"+dare[Math.floor(Math.random()*dare.length)]
        });

    }
};
