const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Utility function to log actions
const logAction = (action, details) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        details
    };
    
    try {
        const logsPath = path.join('./data', 'logs.json');
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        logs.push(logEntry);
        
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Failed to log action:', error);
    }
};

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        console.log(`✅ ${member.user.tag} joined the server`);
        
        // Log the join event
        logAction('MEMBER_JOIN', {
            userId: member.user.id,
            userTag: member.user.tag,
            guildId: member.guild.id,
            joinedAt: member.joinedAt
        });

        // Send join message to system channel or general channel
        const channel = member.guild.systemChannel || 
                       member.guild.channels.cache.find(ch => ch.name === 'general') ||
                       member.guild.channels.cache.filter(ch => ch.type === 0).first();
        
        if (channel) {
            const joinEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎉 Welcome to Maj Studio!')
                .setDescription(`${config.messages.joinMessage}\n\nHello ${member.user}, welcome to our community!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '👤 Member Count', value: `${member.guild.memberCount}`, inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setFooter({ text: 'Make sure to read the rules!' })
                .setTimestamp();

            await channel.send({ embeds: [joinEmbed] });
        }

        // Send welcome DM to the user
        try {
            const welcomeDM = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Welcome to Maj Studio! 🎉')
                .setDescription(`Hi ${member.user.username}! Welcome to our Discord server.\n\n**Next Steps:**\n• Read and accept the rules to get full access\n• Introduce yourself in the appropriate channel\n• Feel free to ask questions if you need help!`)
                .setThumbnail(member.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            await member.send({ embeds: [welcomeDM] });
        } catch (error) {
            console.log(`Couldn't send welcome DM to ${member.user.tag}: ${error.message}`);
        }
    },
};