const { Events } = require('discord.js');
const { logAction } = require('../utils/logger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignore bot messages and empty content
        if (message.author?.bot || !message.content) return;

        await logAction('MESSAGE_DELETE', {
            userId: message.author.id,
            userTag: message.author.tag,
            channelId: message.channelId,
            channelName: message.channel.name,
            content: message.content,
            messageId: message.id
        });
    },
};
