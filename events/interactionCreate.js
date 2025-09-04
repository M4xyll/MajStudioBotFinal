const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { createTicketChannel, loadTickets, saveTickets } = require('../handlers/ticketHandler');

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
    
    // Clear the recap and show confirmation
    await interaction.update({
        embeds: [],
        components: []
    });

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

    await interaction.followUp({
        embeds: [confirmationEmbed],
        components: [ticketButtons]
    });

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
    const cancelEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Application Cancelled')
        .setDescription('Your partnership application has been cancelled. You can restart the process anytime by creating a new ticket.')
        .setTimestamp();

    await interaction.update({
        embeds: [cancelEmbed],
        components: []
    });
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
    
    // Clear the recap and show confirmation
    await interaction.update({
        embeds: [],
        components: []
    });

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

    await interaction.followUp({
        embeds: [confirmationEmbed],
        components: [ticketButtons]
    });

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
    const cancelEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('❌ Application Cancelled')
        .setDescription('Your team application has been cancelled. You can restart the process anytime by creating a new ticket.')
        .setTimestamp();

    await interaction.update({
        embeds: [cancelEmbed],
        components: []
    });
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
        
        // Here you would typically query your database/webhook
        // For now, we'll simulate order retrieval
        const orderEmbed = new EmbedBuilder()
            .setColor('#ffa500')
            .setTitle('📦 Order Retrieved')
            .setDescription(`Order code: \`${orderCode}\``)
            .addFields(
                { name: '📋 Status', value: 'This is a demo - order system will be connected to your website webhook', inline: true },
                { name: '🔧 Setup Required', value: 'Configure ORDER_WEBHOOK_URL environment variable', inline: true }
            )
            .setFooter({ text: 'Order retrieval system ready for integration' })
            .setTimestamp();

        await interaction.reply({ embeds: [orderEmbed], ephemeral: true });
        
        logAction('ORDER_RETRIEVED', {
            orderCode: orderCode,
            userId: interaction.user.id,
            userTag: interaction.user.tag
        });
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
        const transcript = messages.reverse().map(msg => 
            `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}`
        ).join('\n');

        const transcriptEmbed = new EmbedBuilder()
            .setColor('#636363')
            .setTitle('📄 Ticket Transcript')
            .setDescription(`**Channel:** ${channel.name}\n**Closed:** ${new Date().toLocaleString()}`)
            .addFields(
                { name: '📝 Message Count', value: `${messages.size} messages`, inline: true }
            )
            .setTimestamp();

        // Send transcript as file if it's too long, otherwise as embed
        if (transcript.length > 4000) {
            const Buffer = require('buffer').Buffer;
            const attachment = {
                attachment: Buffer.from(transcript, 'utf8'),
                name: `transcript-${channel.name}-${Date.now()}.txt`
            };
            
            await transcriptChannel.send({
                embeds: [transcriptEmbed],
                files: [attachment]
            });
        } else {
            transcriptEmbed.addFields(
                { name: '💬 Messages', value: `\`\`\`${transcript.substring(0, 1000)}${transcript.length > 1000 ? '...' : ''}\`\`\``, inline: false }
            );
            
            await transcriptChannel.send({ embeds: [transcriptEmbed] });
        }

    } catch (error) {
        console.error('Error creating transcript:', error);
    }
}