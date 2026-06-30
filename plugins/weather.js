module.exports = {
    name: "weather",

    async execute({ sock, from, args }) {

        if(!args.length){
            return sock.sendMessage(from,{
                text:"Example:\n.weather Nairobi"
            });
        }

        await sock.sendMessage(from,{
            text:"🌦 Weather command coming soon..."
        });

    }
};
