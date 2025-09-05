const { Events } = require('discord.js');
const { logAction } = require('../utils/logger');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignore bot messages and empty content
        if (oldMessage.author?.bot || !oldMessage.content || !newMessage.content) return;
        
        // If content hasn't changed, ignore (might be embed or attachment updates)
        if (oldMessage.content === newMessage.content) return;

        await logAction('MESSAGE_EDIT', {
            userId: oldMessage.author.id,
            userTag: oldMessage.author.tag,
            channelId: oldMessage.channelId,
            channelName: oldMessage.channel.name,
            oldContent: oldMessage.content,
            newContent: newMessage.content,
            messageId: oldMessage.id,
            messageUrl: oldMessage.url
        });
    },
};
