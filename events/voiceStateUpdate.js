const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
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

// Function to load temp channels data
const loadTempChannels = () => {
    try {
        const tempChannelsPath = path.join('./data', 'tempChannels.json');
        return JSON.parse(fs.readFileSync(tempChannelsPath, 'utf8'));
    } catch (error) {
        return {};
    }
};

// Function to save temp channels data
const saveTempChannels = (data) => {
    try {
        const tempChannelsPath = path.join('./data', 'tempChannels.json');
        fs.writeFileSync(tempChannelsPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save temp channels:', error);
    }
};

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const tempVoiceChannelId = process.env.TEMP_VOICE_CHANNEL_ID || config.channels.tempVoice;
        
        // Handle joining temp voice channel
        if (newState.channelId === tempVoiceChannelId && newState.member) {
            try {
                const guild = newState.guild;
                const member = newState.member;
                
                // Create a new temporary voice channel
                const tempChannel = await guild.channels.create({
                    name: `${member.displayName}'s Voice`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parent,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        },
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers
                            ],
                        },
                    ],
                });

                // Move the member to the new channel
                await member.voice.setChannel(tempChannel);

                // Save the temp channel info
                const tempChannels = loadTempChannels();
                tempChannels[tempChannel.id] = {
                    ownerId: member.id,
                    ownerTag: member.user.tag,
                    createdAt: new Date().toISOString()
                };
                saveTempChannels(tempChannels);

                console.log(`✅ Created temp voice channel: ${tempChannel.name} for ${member.user.tag}`);
                
                logAction('TEMP_CHANNEL_CREATED', {
                    channelId: tempChannel.id,
                    channelName: tempChannel.name,
                    ownerId: member.id,
                    ownerTag: member.user.tag
                });

            } catch (error) {
                console.error('Error creating temp voice channel:', error);
                logAction('TEMP_CHANNEL_ERROR', {
                    error: error.message,
                    userId: newState.member?.id,
                    userTag: newState.member?.user.tag
                });
            }
        }

        // Handle leaving temp voice channels
        if (oldState.channel) {
            const tempChannels = loadTempChannels();
            
            if (tempChannels[oldState.channelId]) {
                // Check if the channel is now empty
                if (oldState.channel.members.size === 0) {
                    try {
                        const channelInfo = tempChannels[oldState.channelId];
                        await oldState.channel.delete('Temporary voice channel is empty');
                        
                        // Remove from temp channels data
                        delete tempChannels[oldState.channelId];
                        saveTempChannels(tempChannels);

                        console.log(`🗑️ Deleted empty temp voice channel: ${oldState.channel.name}`);
                        
                        logAction('TEMP_CHANNEL_DELETED', {
                            channelId: oldState.channelId,
                            channelName: oldState.channel.name,
                            ownerId: channelInfo.ownerId,
                            ownerTag: channelInfo.ownerTag,
                            reason: 'Channel empty'
                        });

                    } catch (error) {
                        console.error('Error deleting temp voice channel:', error);
                        logAction('TEMP_CHANNEL_DELETE_ERROR', {
                            error: error.message,
                            channelId: oldState.channelId
                        });
                    }
                }
            }
        }
    },
};