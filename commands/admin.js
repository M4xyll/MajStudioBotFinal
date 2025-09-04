const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands for channel and user management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('adduser')
                .setDescription('Add a user to a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to add the user to')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removeuser')
                .setDescription('Remove a user from a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to remove the user from')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('createchannel')
                .setDescription('Create a channel for someone')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('The name of the channel')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to create the channel for')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('The category to place the channel in')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('viewlogs')
                .setDescription('View recent bot logs')
                .addIntegerOption(option =>
                    option.setName('count')
                        .setDescription('Number of logs to show (default: 10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('tickets')
                .setDescription('View all open tickets')
        ),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'adduser':
                await handleAddUser(interaction);
                break;
            case 'removeuser':
                await handleRemoveUser(interaction);
                break;
            case 'createchannel':
                await handleCreateChannel(interaction);
                break;
            case 'viewlogs':
                await handleViewLogs(interaction);
                break;
            case 'tickets':
                await handleViewTickets(interaction);
                break;
        }
    },
};

async function handleAddUser(interaction) {
    const channel = interaction.options.getChannel('channel');
    const user = interaction.options.getUser('user');
    
    try {
        await channel.permissionOverwrites.edit(user, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ User Added')
            .setDescription(`Successfully added ${user} to ${channel}`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed] });
        
        logAction('ADMIN_ADD_USER', {
            adminId: interaction.user.id,
            adminTag: interaction.user.tag,
            userId: user.id,
            userTag: user.tag,
            channelId: channel.id,
            channelName: channel.name
        });
        
    } catch (error) {
        console.error('Error adding user to channel:', error);
        await interaction.reply({ 
            content: '❌ Failed to add user to channel. Check permissions and try again.',
            ephemeral: true 
        });
    }
}

async function handleRemoveUser(interaction) {
    const channel = interaction.options.getChannel('channel');
    const user = interaction.options.getUser('user');
    
    try {
        await channel.permissionOverwrites.edit(user, {
            ViewChannel: false
        });
        
        const successEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('🚫 User Removed')
            .setDescription(`Successfully removed ${user} from ${channel}`)
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed] });
        
        logAction('ADMIN_REMOVE_USER', {
            adminId: interaction.user.id,
            adminTag: interaction.user.tag,
            userId: user.id,
            userTag: user.tag,
            channelId: channel.id,
            channelName: channel.name
        });
        
    } catch (error) {
        console.error('Error removing user from channel:', error);
        await interaction.reply({ 
            content: '❌ Failed to remove user from channel. Check permissions and try again.',
            ephemeral: true 
        });
    }
}

async function handleCreateChannel(interaction) {
    const name = interaction.options.getString('name');
    const user = interaction.options.getUser('user');
    const category = interaction.options.getChannel('category');
    
    try {
        const channelOptions = {
            name: name,
            type: 0, // Text channel
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels
                    ],
                },
            ],
        };
        
        if (category) {
            channelOptions.parent = category;
        }
        
        const newChannel = await interaction.guild.channels.create(channelOptions);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🆕 Channel Created')
            .setDescription(`Successfully created ${newChannel} for ${user}`)
            .addFields(
                { name: '📝 Channel Name', value: name, inline: true },
                { name: '👤 Created For', value: user.tag, inline: true },
                { name: '📁 Category', value: category ? category.name : 'None', inline: true }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [successEmbed] });
        
        logAction('ADMIN_CREATE_CHANNEL', {
            adminId: interaction.user.id,
            adminTag: interaction.user.tag,
            channelId: newChannel.id,
            channelName: newChannel.name,
            forUserId: user.id,
            forUserTag: user.tag,
            categoryId: category?.id,
            categoryName: category?.name
        });
        
    } catch (error) {
        console.error('Error creating channel:', error);
        await interaction.reply({ 
            content: '❌ Failed to create channel. Check permissions and try again.',
            ephemeral: true 
        });
    }
}

async function handleViewLogs(interaction) {
    const count = interaction.options.getInteger('count') || 10;
    
    try {
        const logsPath = path.join('./data', 'logs.json');
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        
        const recentLogs = logs.slice(-count).reverse();
        
        if (recentLogs.length === 0) {
            await interaction.reply({ 
                content: '📋 No logs found.',
                ephemeral: true 
            });
            return;
        }
        
        const logEmbed = new EmbedBuilder()
            .setColor('#636363')
            .setTitle('📋 Recent Bot Logs')
            .setDescription(`Showing last ${recentLogs.length} log entries`)
            .setTimestamp();
        
        const logEntries = recentLogs.slice(0, 10).map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            return `\`${timestamp}\` **${log.action}**`;
        }).join('\n');
        
        logEmbed.addFields(
            { name: '📝 Log Entries', value: logEntries || 'No entries', inline: false }
        );
        
        await interaction.reply({ embeds: [logEmbed], ephemeral: true });
        
    } catch (error) {
        console.error('Error reading logs:', error);
        await interaction.reply({ 
            content: '❌ Failed to read logs.',
            ephemeral: true 
        });
    }
}

async function handleViewTickets(interaction) {
    try {
        const ticketsPath = path.join('./data', 'tickets.json');
        const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
        
        const openTickets = Object.entries(tickets).filter(([id, ticket]) => ticket.status === 'open');
        
        if (openTickets.length === 0) {
            await interaction.reply({ 
                content: '🎫 No open tickets found.',
                ephemeral: true 
            });
            return;
        }
        
        const ticketEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎫 Open Tickets')
            .setDescription(`Found ${openTickets.length} open ticket(s)`)
            .setTimestamp();
        
        openTickets.slice(0, 10).forEach(([channelId, ticket]) => {
            const channel = interaction.guild.channels.cache.get(channelId);
            const channelMention = channel ? `<#${channelId}>` : `ID: ${channelId}`;
            const createdAt = new Date(ticket.createdAt).toLocaleDateString();
            
            ticketEmbed.addFields({
                name: `${ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)} Ticket`,
                value: `**Channel:** ${channelMention}\n**User:** ${ticket.userTag}\n**Created:** ${createdAt}`,
                inline: true
            });
        });
        
        if (openTickets.length > 10) {
            ticketEmbed.setFooter({ text: `... and ${openTickets.length - 10} more tickets` });
        }
        
        await interaction.reply({ embeds: [ticketEmbed], ephemeral: true });
        
    } catch (error) {
        console.error('Error reading tickets:', error);
        await interaction.reply({ 
            content: '❌ Failed to read tickets.',
            ephemeral: true 
        });
    }
}

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