const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Import centralized logger
const { logAction } = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        console.log(`❌ ${member.user.tag} left the server`);
        
        // Log the leave event
        logAction('MEMBER_LEAVE', {
            userId: member.user.id,
            userTag: member.user.tag,
            guildId: member.guild.id,
            leftAt: new Date().toISOString()
        });

        // Send leave message to configured goodbye channel
        const goodbyeChannelId = process.env.GOODBYE_CHANNEL_ID || config.channels.goodbye;
        let channel = null;
        
        if (goodbyeChannelId && goodbyeChannelId !== 'SET_GOODBYE_CHANNEL_ID') {
            channel = member.guild.channels.cache.get(goodbyeChannelId);
        }
        
        // Fallback to system channel if goodbye channel not found
        if (!channel) {
            channel = member.guild.systemChannel || 
                     member.guild.channels.cache.find(ch => ch.name === 'general') ||
                     member.guild.channels.cache.filter(ch => ch.type === 0).first();
        }
        
        if (channel) {
            const leaveEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('👋 Member Left')
                .setDescription(`${config.messages.leaveMessage}\n\n**${member.user.tag}** has left the server.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Member Count', value: `${member.guild.memberCount}`, inline: true },
                    { name: '📅 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [leaveEmbed] });
        }
    },
};