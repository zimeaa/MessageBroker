class Message {
    constructor(id, clientId, userId, message) {
        this.id = id;
        this.clientId = clientId;
        this.userId = userId;
        this.message = message;
    }

    toJSON() {
        return {
            id: this.id,
            clientId: this.clientId,
            userId: this.userId,
            message: this.message
        };
    }
}

module.exports = Message;