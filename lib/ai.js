const { Mistral } = require("@mistralai/mistralai");
const config = require("../config");

const client = new Mistral({
    apiKey: config.MISTRAL_API_KEY
});

async function askAI(prompt) {
    const response = await client.chat.complete({
        model: "mistral-small-latest",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    });

    return response.choices[0].message.content;
}

module.exports = {
    askAI
};
