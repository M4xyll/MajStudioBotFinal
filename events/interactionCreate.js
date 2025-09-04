const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config.json');
const { createTicketChannel, loadTickets, saveTickets } = require('../handlers/ticketHandler');

// Import centralized logger
const { logAction } = require('../utils/logger');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await handleButtonInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            logAction('INTERACTION_ERROR', {
                error: error.message,
                interactionType: interaction.type,
                userId: interaction.user.id,
                userTag: interaction.user.tag
            });
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your request. Please try again later.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};

async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Command Error')
            .setDescription('There was an error while executing this command!')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

async function handleButtonInteraction(interaction) {
    const { customId } = interaction;
    
    if (customId === 'accept_rules') {
        await handleRuleAcceptance(interaction);
    } else if (customId.startsWith('ticket_')) {
        await handleTicketCreation(interaction);
    } else if (customId.startsWith('close_ticket')) {
        await handleTicketClose(interaction);
    } else if (customId.startsWith('confirm_close')) {
        await handleTicketCloseConfirm(interaction);
    } else if (customId.startsWith('cancel_close')) {
        await handleTicketCloseCancel(interaction);
    } else if (customId.startsWith('order_')) {
        await handleOrderRetrieve(interaction);
    } else if (customId.startsWith('confirm_partnership')) {
        await handlePartnershipConfirm(interaction);
    } else if (customId.startsWith('cancel_partnership')) {
        await handlePartnershipCancel(interaction);
    } else if (customId.startsWith('confirm_join')) {
        await handleJoinConfirm(interaction);
    } else if (customId.startsWith('cancel_join')) {
        await handleJoinCancel(interaction);
    } else if (customId.startsWith('details_')) {
        await handleDetailsView(interaction);
    }
}

async function handleRuleAcceptance(interaction) {
    const rulesRoleId = process.env.RULES_ROLE_ID || config.roles.rulesAccepted;
    
    if (!rulesRoleId || rulesRoleId === 'SET_RULES_ROLE_ID') {
        await interaction.reply({ 
            content: '❌ Rules role is not configured. Please contact an administrator.',
            ephemeral: true 
        });
        return;
    }

    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(rulesRoleId);
    
    if (!role) {
        await interaction.reply({ 
            content: '❌ Rules role not found. Please contact an administrator.',
            ephemeral: true 
        });
        return;
    }

    if (member.roles.cache.has(rulesRoleId)) {
        await interaction.reply({ 
            content: '✅ You have already accepted the rules!',
            ephemeral: true 
        });
        return;
    }

    try {
        await member.roles.add(role);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Rules Accepted!')
            .setDescription('Thank you for accepting the rules! You now have full access to the server.')
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        
        logAction('RULES_ACCEPTED', {
            userId: member.id,
            userTag: member.user.tag,
            roleId: rulesRoleId,
            roleName: role.name
        });

        console.log(`✅ ${member.user.tag} accepted the rules and received the ${role.name} role`);
        
    } catch (error) {
        console.error('Error adding rules role:', error);
        await interaction.reply({ 
            content: '❌ Failed to add the rules role. Please contact an administrator.',
            ephemeral: true 
        });
    }
}

async function handleTicketCreation(interaction) {
    const ticketType = interaction.customId.split('_')[1]; // Extract type from customId
    
    const typeMap = {
        'support': 'support',
        'partnership': 'partnership', 
        'join': 'join'
    };
    
    const actualType = typeMap[ticketType];
    if (!actualType) {
        await interaction.reply({ 
            content: '❌ Invalid ticket type.',
            ephemeral: true 
        });
        return;
    }
    
    await createTicketChannel(interaction, actualType);
}

async function handleTicketClose(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    if (interaction.channel.id !== channelId) {
        await interaction.reply({ 
            content: '❌ This button is for a different channel.',
            ephemeral: true 
        });
        return;
    }
    
    const confirmEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🔒 Close Ticket')
        .setDescription('Are you sure you want to close this ticket?\n\n**This action cannot be undone!**\nA transcript will be saved for reference.')
        .setTimestamp();

    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_close_${channelId}`)
                .setLabel('✅ Yes, Close Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`cancel_close_${channelId}`)
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [confirmEmbed],
        components: [confirmButtons]
    });
}

async function handleTicketCloseConfirm(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    if (interaction.channel.id !== channelId) {
        await interaction.reply({ 
            content: '❌ This confirmation is for a different channel.',
            ephemeral: true 
        });
        return;
    }

    await interaction.deferReply();
    
    try {
        // Create transcript
        await createTranscript(interaction.channel);
        
        // Remove ticket from data
        const tickets = loadTickets();
        delete tickets[channelId];
        saveTickets(tickets);
        
        logAction('TICKET_CLOSED', {
            ticketId: channelId,
            closedBy: interaction.user.id,
            closedByTag: interaction.user.tag
        });

        await interaction.editReply('✅ Ticket will be closed in 5 seconds...');
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete('Ticket closed');
            } catch (error) {
                console.error('Error deleting ticket channel:', error);
            }
        }, 5000);
        
    } catch (error) {
        console.error('Error closing ticket:', error);
        await interaction.editReply('❌ Failed to close ticket. Please try again or contact an administrator.');
    }
}

async function handleTicketCloseCancel(interaction) {
    const cancelEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Close Cancelled')
        .setDescription('The ticket close operation has been cancelled. The ticket remains open.')
        .setTimestamp();

    await interaction.update({
        embeds: [cancelEmbed],
        components: []
    });
}

async function handleOrderRetrieve(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('order_code_modal')
        .setTitle('📦 Order Retrieval');

    const orderCodeInput = new TextInputBuilder()
        .setCustomId('order_code')
        .setLabel('Order Code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your order code here...')
        .setRequired(true)
        .setMaxLength(50);

    const firstRow = new ActionRowBuilder().addComponents(orderCodeInput);
    modal.addComponents(firstRow);

    await interaction.showModal(modal);
}

async function handlePartnershipConfirm(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    if (interaction.channel.id !== channelId) {
        await interaction.reply({ 
            content: '❌ This confirmation is for a different channel.',
            ephemeral: true 
        });
        return;
    }

    const tickets = loadTickets();
    const ticket = tickets[channelId];
    
    try {
        // Create confirmation embed and buttons
        const confirmationEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Partnership Application Submitted!')
            .setDescription('Thank you for your partnership application! Our team will review your proposal and get back to you soon.')
            .addFields(
                { name: '⏰ What happens next?', value: 'Our partnership team will review your application and contact you within 3-5 business days.', inline: false }
            )
            .setTimestamp();

        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`close_ticket_${channelId}`)
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`details_partnership_${channelId}`)
                    .setLabel('📋 View Details')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Update the message with confirmation content
        await interaction.update({
            embeds: [confirmationEmbed],
            components: [ticketButtons]
        });
    } catch (error) {
        console.error('Error in partnership confirmation:', error);
        
        // If update fails, try to reply instead
        try {
            if (!interaction.replied) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription('There was an error processing your confirmation. Your application has been saved.')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('Failed to send error response:', replyError);
        }
    }

    // Update ticket status
    ticket.status = 'submitted';
    ticket.submittedAt = new Date().toISOString();
    delete ticket.currentStep;
    saveTickets(tickets);

    logAction('PARTNERSHIP_SUBMITTED', {
        ticketId: channelId,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        data: ticket.partnershipData
    });
}

async function handlePartnershipCancel(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    try {
        const cancelEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Application Cancelled')
            .setDescription('Your partnership application has been cancelled. You can restart the process anytime by creating a new ticket.\n\n**This ticket will now be closed and a transcript will be saved.**')
            .setTimestamp();

        await interaction.update({
            embeds: [cancelEmbed],
            components: []
        });

        // Wait a moment for user to read the message
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Create transcript before closing
        await createTranscript(interaction.channel);
        
        // Update ticket status
        const tickets = loadTickets();
        if (tickets[channelId]) {
            tickets[channelId].status = 'cancelled';
            tickets[channelId].closedAt = new Date().toISOString();
            delete tickets[channelId];
            saveTickets(tickets);
        }

        // Log the cancellation
        logAction('PARTNERSHIP_CANCELLED', {
            ticketId: channelId,
            userId: interaction.user.id,
            userTag: interaction.user.tag
        });

        // Delete the channel
        await interaction.channel.delete('Partnership application cancelled');
        
    } catch (error) {
        console.error('Error in partnership cancellation:', error);
    }
}

async function handleJoinConfirm(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    if (interaction.channel.id !== channelId) {
        await interaction.reply({ 
            content: '❌ This confirmation is for a different channel.',
            ephemeral: true 
        });
        return;
    }

    const tickets = loadTickets();
    const ticket = tickets[channelId];
    
    try {
        // Create confirmation embed and buttons
        const confirmationEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Team Application Submitted!')
            .setDescription('Thank you for your interest in joining Maj Studio! Your application has been submitted successfully.')
            .addFields(
                { name: '📧 Next Steps', value: 'Our HR team will review your application and contact you via email within 1-2 weeks.', inline: false },
                { name: '📞 Interview Process', value: 'If selected, you\'ll be invited for an interview to discuss your application further.', inline: false }
            )
            .setTimestamp();

        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`close_ticket_${channelId}`)
                    .setLabel('🔒 Close Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`details_join_${channelId}`)
                    .setLabel('📋 View Details')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Update the message with confirmation content
        await interaction.update({
            embeds: [confirmationEmbed],
            components: [ticketButtons]
        });
    } catch (error) {
        console.error('Error in join confirmation:', error);
        
        // If update fails, try to reply instead
        try {
            if (!interaction.replied) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription('There was an error processing your confirmation. Your application has been saved.')
                    .setTimestamp();

                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (replyError) {
            console.error('Failed to send error response:', replyError);
        }
    }

    // Update ticket status
    ticket.status = 'submitted';
    ticket.submittedAt = new Date().toISOString();
    delete ticket.currentStep;
    saveTickets(tickets);

    logAction('JOIN_APPLICATION_SUBMITTED', {
        ticketId: channelId,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        data: ticket.joinData
    });
}

async function handleJoinCancel(interaction) {
    const channelId = interaction.customId.split('_')[2];
    
    try {
        const cancelEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Application Cancelled')
            .setDescription('Your team application has been cancelled. You can restart the process anytime by creating a new ticket.\n\n**This ticket will now be closed and a transcript will be saved.**')
            .setTimestamp();

        await interaction.update({
            embeds: [cancelEmbed],
            components: []
        });

        // Wait a moment for user to read the message
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Create transcript before closing
        await createTranscript(interaction.channel);
        
        // Update ticket status
        const tickets = loadTickets();
        if (tickets[channelId]) {
            tickets[channelId].status = 'cancelled';
            tickets[channelId].closedAt = new Date().toISOString();
            delete tickets[channelId];
            saveTickets(tickets);
        }

        // Log the cancellation
        logAction('JOIN_APPLICATION_CANCELLED', {
            ticketId: channelId,
            userId: interaction.user.id,
            userTag: interaction.user.tag
        });

        // Delete the channel
        await interaction.channel.delete('Team application cancelled');
        
    } catch (error) {
        console.error('Error in join cancellation:', error);
    }
}

async function handleDetailsView(interaction) {
    const [, type, channelId] = interaction.customId.split('_');
    
    const tickets = loadTickets();
    const ticket = tickets[channelId];
    
    if (!ticket) {
        await interaction.reply({ 
            content: '❌ Ticket data not found.',
            ephemeral: true 
        });
        return;
    }

    if (type === 'partnership' && ticket.partnershipData) {
        const data = ticket.partnershipData;
        const detailsEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🤝 Partnership Application Details')
            .addFields(
                { name: '🏢 Company/Organization', value: data.company_name || 'Not provided', inline: false },
                { name: '🎯 What you need', value: data.partnership_need || 'Not provided', inline: false },
                { name: '💼 What you offer', value: data.partnership_offer || 'Not provided', inline: false },
                { name: '🔗 Project/Company Link', value: data.project_link || 'Not provided', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [detailsEmbed], ephemeral: true });
    } else if (type === 'join' && ticket.joinData) {
        const data = ticket.joinData;
        const detailsEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('👥 Team Application Details')
            .addFields(
                { name: '📧 Email Address', value: data.email || 'Not provided', inline: false },
                { name: '💭 Motivation', value: data.motivation || 'Not provided', inline: false },
                { name: '👔 Role Applied For', value: data.role || 'Not provided', inline: false },
                { name: '🧠 Relevant Knowledge', value: data.knowledge || 'Not provided', inline: false },
                { name: '💬 Additional Information', value: data.additional || 'Not provided', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [detailsEmbed], ephemeral: true });
    } else {
        await interaction.reply({ 
            content: '❌ No details available for this ticket.',
            ephemeral: true 
        });
    }
}

async function handleModalSubmit(interaction) {
    if (interaction.customId === 'order_code_modal') {
        const orderCode = interaction.fields.getTextInputValue('order_code');
        
        // Defer the reply since API call might take some time
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // Get API endpoint from environment variables
            const apiUrl = process.env.ORDER_API_URL;
            
            if (!apiUrl) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Configuration Error')
                    .setDescription('Order API URL is not configured. Please contact an administrator.')
                    .setFooter({ text: 'API endpoint required for order retrieval' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Make API request to retrieve order information
            console.log(`🔍 Retrieving order ${orderCode} from API: ${apiUrl}`);
            
            const response = await axios.get(`${apiUrl}/order/${orderCode}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Maj-Studio-Discord-Bot/1.0'
                },
                timeout: 10000 // 10 second timeout
            });

            if (response.status === 200 && response.data) {
                const orderData = response.data;
                
                // Create embed with order information
                const orderEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('📦 Order Found')
                    .setDescription(`Order details for code: \`${orderCode}\``)
                    .addFields(
                        { 
                            name: '📋 Order Status', 
                            value: orderData.status || 'Unknown', 
                            inline: true 
                        },
                        { 
                            name: '💰 Total Amount', 
                            value: orderData.total ? `$${orderData.total}` : 'N/A', 
                            inline: true 
                        },
                        { 
                            name: '📅 Order Date', 
                            value: orderData.created_at ? new Date(orderData.created_at).toLocaleDateString() : 'N/A', 
                            inline: true 
                        }
                    )
                    .setFooter({ text: 'Order information retrieved from your server' })
                    .setTimestamp();

                // Add items if available
                if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
                    const itemsList = orderData.items.slice(0, 5).map(item => 
                        `• ${item.name || 'Unknown Item'} ${item.quantity ? `(x${item.quantity})` : ''} - ${item.price ? `$${item.price}` : 'N/A'}`
                    ).join('\n');
                    
                    orderEmbed.addFields({
                        name: '🛍️ Items',
                        value: itemsList + (orderData.items.length > 5 ? `\n... and ${orderData.items.length - 5} more items` : ''),
                        inline: false
                    });
                }

                // Add customer info if available
                if (orderData.customer) {
                    orderEmbed.addFields({
                        name: '👤 Customer',
                        value: orderData.customer.name || orderData.customer.email || 'N/A',
                        inline: true
                    });
                }

                // Add shipping info if available
                if (orderData.shipping_status) {
                    orderEmbed.addFields({
                        name: '🚚 Shipping',
                        value: orderData.shipping_status,
                        inline: true
                    });
                }

                await interaction.editReply({ embeds: [orderEmbed] });

                logAction('ORDER_RETRIEVED_SUCCESS', {
                    orderCode: orderCode,
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    orderStatus: orderData.status,
                    orderTotal: orderData.total
                });

            } else {
                throw new Error('Invalid response from API');
            }

        } catch (error) {
            console.error('Error retrieving order:', error);
            
            let errorMessage = 'Failed to retrieve order information.';
            let errorDetails = 'Please try again later or contact support.';

            if (error.response) {
                // API responded with error status
                if (error.response.status === 404) {
                    errorMessage = 'Order not found.';
                    errorDetails = `No order found with code: \`${orderCode}\`\nPlease check the code and try again.`;
                } else if (error.response.status === 500) {
                    errorMessage = 'Server error.';
                    errorDetails = 'The order system is experiencing issues. Please try again later.';
                } else {
                    errorMessage = `API Error (${error.response.status})`;
                    errorDetails = error.response.data?.message || 'Unknown error occurred.';
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                errorMessage = 'Cannot connect to order system.';
                errorDetails = 'The order API is currently unavailable. Please try again later.';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout.';
                errorDetails = 'The request took too long. Please try again.';
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`❌ ${errorMessage}`)
                .setDescription(errorDetails)
                .addFields(
                    { name: '🔍 Order Code', value: `\`${orderCode}\``, inline: true },
                    { name: '⏰ Time', value: new Date().toLocaleTimeString(), inline: true }
                )
                .setFooter({ text: 'If the problem persists, please contact an administrator' })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });

            logAction('ORDER_RETRIEVAL_ERROR', {
                orderCode: orderCode,
                userId: interaction.user.id,
                userTag: interaction.user.tag,
                error: error.message,
                errorCode: error.code,
                statusCode: error.response?.status
            });
        }
    }
}

async function createTranscript(channel) {
    try {
        const transcriptChannelId = process.env.TRANSCRIPT_CHANNEL_ID || config.channels.transcript;
        
        if (!transcriptChannelId || transcriptChannelId === 'SET_TRANSCRIPT_CHANNEL_ID') {
            console.log('Transcript channel not configured, skipping transcript creation');
            return;
        }

        const transcriptChannel = channel.guild.channels.cache.get(transcriptChannelId);
        if (!transcriptChannel) {
            console.log('Transcript channel not found, skipping transcript creation');
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });
        const htmlTranscript = await generateHTMLTranscript(channel, messages);

        const transcriptEmbed = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('📄 Ticket Transcript Generated')
            .setDescription(`**Channel:** #${channel.name}\n**Closed:** ${new Date().toLocaleString()}\n**Guild:** ${channel.guild.name}`)
            .addFields(
                { name: '💬 Message Count', value: `${messages.size} messages`, inline: true },
                { name: '📁 Format', value: 'HTML (Discord Style)', inline: true }
            )
            .setTimestamp();

        const Buffer = require('buffer').Buffer;
        const attachment = {
            attachment: Buffer.from(htmlTranscript, 'utf8'),
            name: `transcript-${channel.name}-${Date.now()}.html`
        };
        
        await transcriptChannel.send({
            embeds: [transcriptEmbed],
            files: [attachment]
        });

    } catch (error) {
        console.error('Error creating transcript:', error);
    }
}

async function generateHTMLTranscript(channel, messages) {
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    
    let messagesHTML = '';
    
    for (const msg of sortedMessages.values()) {
        const timestamp = new Date(msg.createdTimestamp).toLocaleString();
        const avatarURL = msg.author.displayAvatarURL({ size: 40, extension: 'png' });
        const authorColor = msg.member?.displayHexColor || '#ffffff';
        
        // Handle embeds
        let embedsHTML = '';
        if (msg.embeds.length > 0) {
            for (const embed of msg.embeds) {
                embedsHTML += `
                    <div class="embed">
                        <div class="embed-left-border" style="background-color: ${embed.hexColor || '#5865f2'};"></div>
                        <div class="embed-content">
                            ${embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : ''}
                            ${embed.description ? `<div class="embed-description">${escapeHtml(embed.description)}</div>` : ''}
                            ${embed.fields.map(field => `
                                <div class="embed-field">
                                    <div class="embed-field-name">${escapeHtml(field.name)}</div>
                                    <div class="embed-field-value">${escapeHtml(field.value)}</div>
                                </div>
                            `).join('')}
                            ${embed.footer ? `<div class="embed-footer">${escapeHtml(embed.footer.text)}</div>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        messagesHTML += `
            <div class="message">
                <div class="message-left">
                    <img class="avatar" src="${avatarURL}" alt="${escapeHtml(msg.author.username)}'s avatar">
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="username" style="color: ${authorColor};">${escapeHtml(msg.author.username)}</span>
                        <span class="timestamp">${timestamp}</span>
                    </div>
                    ${msg.content ? `<div class="message-text">${escapeHtml(msg.content)}</div>` : ''}
                    ${embedsHTML}
                </div>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Transcript - #${channel.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            line-height: 1.375;
            font-size: 16px;
        }
        
        .header {
            background-color: #2f3136;
            border-bottom: 1px solid #202225;
            padding: 20px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .header-info {
            color: #b9bbbe;
            font-size: 14px;
        }
        
        .messages-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .message {
            display: flex;
            margin-bottom: 20px;
            padding: 2px 0;
        }
        
        .message:hover {
            background-color: #32353b;
            margin: 0 -20px;
            padding: 2px 20px;
        }
        
        .message-left {
            margin-right: 16px;
            flex-shrink: 0;
        }
        
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
        }
        
        .message-content {
            flex: 1;
            min-width: 0;
        }
        
        .message-header {
            display: flex;
            align-items: baseline;
            margin-bottom: 2px;
        }
        
        .username {
            font-weight: 500;
            margin-right: 8px;
            cursor: pointer;
        }
        
        .username:hover {
            text-decoration: underline;
        }
        
        .timestamp {
            font-size: 12px;
            color: #72767d;
            font-weight: 400;
        }
        
        .message-text {
            margin-top: 4px;
            word-wrap: break-word;
        }
        
        .embed {
            display: flex;
            max-width: 520px;
            margin-top: 8px;
            border-radius: 4px;
            background-color: #2f3136;
        }
        
        .embed-left-border {
            width: 4px;
            border-radius: 4px 0 0 4px;
            flex-shrink: 0;
        }
        
        .embed-content {
            padding: 16px;
            border-radius: 0 4px 4px 0;
        }
        
        .embed-title {
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
        }
        
        .embed-description {
            color: #dcddde;
            margin-bottom: 8px;
        }
        
        .embed-field {
            margin-bottom: 8px;
        }
        
        .embed-field-name {
            color: #ffffff;
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 2px;
        }
        
        .embed-field-value {
            color: #dcddde;
            font-size: 14px;
        }
        
        .embed-footer {
            color: #72767d;
            font-size: 12px;
            margin-top: 8px;
        }
        
        .footer {
            background-color: #2f3136;
            border-top: 1px solid #202225;
            padding: 20px;
            text-align: center;
            color: #72767d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>#${escapeHtml(channel.name)}</h1>
        <div class="header-info">
            <strong>${escapeHtml(channel.guild.name)}</strong> • 
            Generated on ${new Date().toLocaleString()} • 
            ${messages.size} messages
        </div>
    </div>
    
    <div class="messages-container">
        ${messagesHTML}
    </div>
    
    <div class="footer">
        Generated by Maj Studio Bot • Discord Transcript System
    </div>
</body>
</html>
    `;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}