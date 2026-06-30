const store = new Map();

function saveViewOnce(messageId, media) {
    store.set(messageId, media);

    // Remove after 1 hour
    setTimeout(() => {
        store.delete(messageId);
    }, 60 * 60 * 1000);
}

function getViewOnce(messageId) {
    return store.get(messageId);
}

module.exports = {
    saveViewOnce,
    getViewOnce
};
