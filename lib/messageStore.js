const messages = new Map();

function saveMessage(msg) {
    if (!msg?.key?.id) return;

    messages.set(msg.key.id, msg);

    // Automatically remove after 1 hour
    setTimeout(() => {
        messages.delete(msg.key.id);
    }, 60 * 60 * 1000);
}

function getMessage(id) {
    return messages.get(id);
}

module.exports = {
    saveMessage,
    getMessage
};
