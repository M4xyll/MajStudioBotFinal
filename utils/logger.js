const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

let botClient = null;

// Set the bot client reference (called from bot.js when client is ready)
function setBotClient(client) {
    botClient = client;
}

// Utility function to log actions (both file and Discord channel)
const logAction = async (action, details) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        details
    };
    
    try {
        // Save to file (existing functionality)
        const logsPath = path.join('./data', 'logs.json');
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        logs.push(logEntry);
        
        // Keep only the last 1000 entries
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
        
        // Send to Discord channel if configured and client is available
        if (botClient) {
            await sendLogToDiscord(action, details, logEntry.timestamp);
        }
        
    } catch (error) {
        console.error('Failed to log action:', error);
    }
};

// Send log entry to Discord channel
async function sendLogToDiscord(action, details, timestamp) {
    try {
        const logsChannelId = process.env.LOGS_CHANNEL_ID || config.channels.logs;
        
        if (!logsChannelId || logsChannelId === 'SET_LOG_CHANNEL_ID') {
            return; // Logs channel not configured
        }
        
        const logsChannel = botClient.channels.cache.get(logsChannelId);
        if (!logsChannel) {
            return; // Logs channel not found
        }
        
        // Create embed based on action type
        const embed = createLogEmbed(action, details, timestamp);
        
        await logsChannel.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('Failed to send log to Discord:', error);
    }
}

// Create different embeds based on log type
function createLogEmbed(action, details, timestamp) {
    const embed = new EmbedBuilder()
        .setTimestamp(new Date(timestamp))
        .setFooter({ text: `Action: ${action}` });
    
    // Set color and content based on action type
    switch (action) {
        case 'BOT_READY':
            embed.setColor('#00ff00')
                .setTitle('🤖 Bot Status')
                .setDescription('✅ Bot is online and ready!')
                .addFields(
                    { name: '🏷️ Bot Tag', value: details.botTag || 'Unknown', inline: true }
                );
            break;
            
        case 'MEMBER_JOIN':
            embed.setColor('#00ff00')
                .setTitle('👋 Member Joined')
                .setDescription('A new member has joined the server!')
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '🏷️ Tag', value: details.userTag || 'Unknown', inline: true }
                );
            break;
            
        case 'MEMBER_LEAVE':
            embed.setColor('#ff6b6b')
                .setTitle('👋 Member Left')
                .setDescription('A member has left the server.')
                .addFields(
                    { name: '👤 User', value: details.userTag || 'Unknown', inline: true },
                    { name: '🆔 User ID', value: details.userId || 'Unknown', inline: true }
                );
            break;
            
        case 'TICKET_CREATED':
            embed.setColor('#0099ff')
                .setTitle('🎫 Ticket Created')
                .setDescription('A new support ticket has been created.')
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '📋 Type', value: details.ticketType || 'Unknown', inline: true },
                    { name: '🔗 Channel', value: `<#${details.channelId}>`, inline: true }
                );
            break;
            
        case 'TICKET_CLOSED':
            embed.setColor('#ff9900')
                .setTitle('🔒 Ticket Closed')
                .setDescription('A support ticket has been closed.')
                .addFields(
                    { name: '👤 Closed by', value: `<@${details.userId}>`, inline: true },
                    { name: '🏷️ User Tag', value: details.userTag || 'Unknown', inline: true },
                    { name: '🔗 Channel', value: details.channelName ? `#${details.channelName}` : 'Unknown', inline: true }
                );
            break;
            
        case 'PARTNERSHIP_SUBMITTED':
        case 'JOIN_APPLICATION_SUBMITTED':
            embed.setColor('#00ff00')
                .setTitle('📝 Application Submitted')
                .setDescription(`A ${action.includes('PARTNERSHIP') ? 'partnership' : 'team'} application has been submitted.`)
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '🔗 Ticket', value: `<#${details.ticketId}>`, inline: true }
                );
            break;
            
        case 'PARTNERSHIP_CANCELLED':
        case 'JOIN_APPLICATION_CANCELLED':
            embed.setColor('#ff6b6b')
                .setTitle('❌ Application Cancelled')
                .setDescription(`A ${action.includes('PARTNERSHIP') ? 'partnership' : 'team'} application has been cancelled.`)
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '🔗 Ticket ID', value: details.ticketId || 'Unknown', inline: true }
                );
            break;
            
        case 'TEMP_CHANNEL_CREATED':
            embed.setColor('#00ff00')
                .setTitle('🔊 Temporary Channel Created')
                .setDescription('A temporary voice channel has been created.')
                .addFields(
                    { name: '👤 Owner', value: `<@${details.ownerId}>`, inline: true },
                    { name: '📢 Channel', value: details.channelName || 'Unknown', inline: true }
                );
            break;
            
        case 'TEMP_CHANNEL_DELETED':
            embed.setColor('#ff6b6b')
                .setTitle('🗑️ Temporary Channel Deleted')
                .setDescription('A temporary voice channel has been deleted.')
                .addFields(
                    { name: '👤 Owner', value: details.ownerTag || 'Unknown', inline: true },
                    { name: '📢 Channel', value: details.channelName || 'Unknown', inline: true },
                    { name: '📝 Reason', value: details.reason || 'Unknown', inline: true }
                );
            break;
            
        case 'ORDER_RETRIEVED_SUCCESS':
            embed.setColor('#00ff00')
                .setTitle('📦 Order Retrieved')
                .setDescription('An order has been successfully retrieved.')
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '🔢 Order Code', value: details.orderCode || 'Unknown', inline: true },
                    { name: '💰 Total', value: details.orderTotal || 'Unknown', inline: true }
                );
            break;
            
        case 'RULE_ACCEPTED':
            embed.setColor('#00ff00')
                .setTitle('✅ Rules Accepted')
                .setDescription('A member has accepted the server rules.')
                .addFields(
                    { name: '👤 User', value: `<@${details.userId}>`, inline: true },
                    { name: '🏷️ Tag', value: details.userTag || 'Unknown', inline: true }
                );
            break;
            
        case 'BOT_ERROR':
            embed.setColor('#ff0000')
                .setTitle('⚠️ Bot Error')
                .setDescription('An error occurred in the bot.')
                .addFields(
                    { name: '📝 Error', value: (details.error || 'Unknown error').substring(0, 1000), inline: false }
                );
            break;
            
        case 'API_HEALTH_CHECK':
            embed.setColor('#00ff00')
                .setTitle('🏥 API Health Check')
                .setDescription('Periodic health check completed successfully.')
                .addFields(
                    { name: '🌐 Service', value: details.service || 'Unknown', inline: true },
                    { name: '📡 Response Time', value: details.responseTime || 'Unknown', inline: true },
                    { name: '📊 Status', value: details.uptime || 'Unknown', inline: true }
                );
            break;
            
        case 'API_HEALTH_RESTORED':
            embed.setColor('#00ff00')
                .setTitle('✅ API Service Restored')
                .setDescription('The API service is back online!')
                .addFields(
                    { name: '🌐 Service', value: details.service || 'Unknown', inline: true },
                    { name: '📡 Response Time', value: details.responseTime || 'Unknown', inline: true },
                    { name: '🔗 Endpoint', value: details.endpoint || 'Unknown', inline: false }
                );
            break;
            
        case 'API_HEALTH_FAILURE':
            embed.setColor('#ff0000')
                .setTitle('❌ API Service Down')
                .setDescription('The API service is currently offline.')
                .addFields(
                    { name: '📝 Error', value: details.error || 'Unknown', inline: true },
                    { name: '🔧 Error Code', value: details.errorCode || 'Unknown', inline: true },
                    { name: '🔗 Endpoint', value: details.endpoint || 'Unknown', inline: false }
                );
            break;

        case 'MESSAGE_EDIT':
            embed.setColor('#ffa500')
                .setTitle('✏️ Message Edited')
                .setDescription(`A message was edited in <#${details.channelId}>`)
                .addFields(
                    { name: '👤 Author', value: `<@${details.userId}>`, inline: true },
                    { name: '🏷️ Tag', value: details.userTag || 'Unknown', inline: true },
                    { name: '📝 Old Content', value: details.oldContent.substring(0, 1024) || 'Unknown', inline: false },
                    { name: '✏️ New Content', value: details.newContent.substring(0, 1024) || 'Unknown', inline: false },
                    { name: '🔗 Jump to Message', value: `[Click Here](${details.messageUrl})`, inline: false }
                );
            break;

        case 'MESSAGE_DELETE':
            embed.setColor('#ff0000')
                .setTitle('🗑️ Message Deleted')
                .setDescription(`A message was deleted in <#${details.channelId}>`)
                .addFields(
                    { name: '👤 Author', value: `<@${details.userId}>`, inline: true },
                    { name: '🏷️ Tag', value: details.userTag || 'Unknown', inline: true },
                    { name: '📝 Content', value: details.content.substring(0, 1024) || 'Unknown', inline: false },
                    { name: '🆔 Message ID', value: details.messageId || 'Unknown', inline: true }
                );
            break;
            
        default:
            // Generic log entry
            embed.setColor('#636363')
                .setTitle('📋 Bot Log')
                .setDescription(`Action: \`${action}\``)
                .addFields(
                    { name: '📝 Details', value: JSON.stringify(details).substring(0, 1000), inline: false }
                );
            break;
    }
    
    return embed;
}

module.exports = {
    logAction,
    setBotClient
};