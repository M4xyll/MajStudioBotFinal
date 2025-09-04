const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

// Function to load tickets data
const loadTickets = () => {
    try {
        const ticketsPath = path.join('./data', 'tickets.json');
        return JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
    } catch (error) {
        return {};
    }
};

// Function to save tickets data
const saveTickets = (data) => {
    try {
        const ticketsPath = path.join('./data', 'tickets.json');
        fs.writeFileSync(ticketsPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save tickets:', error);
    }
};

async function createTicketChannel(interaction, ticketType) {
    const categoryId = process.env.TICKET_CATEGORY_ID || config.channels.ticketCategory;
    
    if (!categoryId || categoryId === 'SET_TICKET_CATEGORY_ID') {
        await interaction.reply({
            content: '❌ Ticket category is not configured. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    const guild = interaction.guild;
    const member = interaction.member;
    const category = guild.channels.cache.get(categoryId);
    
    if (!category) {
        await interaction.reply({
            content: '❌ Ticket category not found. Please contact an administrator.',
            ephemeral: true
        });
        return;
    }

    const channelName = `${member.displayName}-${ticketType}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    try {
        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ],
                },
            ],
        });

        // Store ticket information
        const tickets = loadTickets();
        tickets[ticketChannel.id] = {
            userId: member.id,
            userTag: member.user.tag,
            type: ticketType,
            createdAt: new Date().toISOString(),
            status: 'open'
        };
        saveTickets(tickets);

        await interaction.reply({
            content: `✅ Your ${ticketType} ticket has been created: ${ticketChannel}`,
            ephemeral: true
        });

        logAction('TICKET_CREATED', {
            ticketId: ticketChannel.id,
            userId: member.id,
            userTag: member.user.tag,
            type: ticketType
        });

        // Initialize the ticket based on type
        if (ticketType === 'support') {
            await initializeSupportTicket(ticketChannel, member);
        } else if (ticketType === 'partnership') {
            await initializePartnershipTicket(ticketChannel, member);
        } else if (ticketType === 'join') {
            await initializeJoinTicket(ticketChannel, member);
        }

    } catch (error) {
        console.error('Error creating ticket channel:', error);
        await interaction.reply({
            content: '❌ Failed to create ticket channel. Please try again or contact an administrator.',
            ephemeral: true
        });
    }
}

async function initializeSupportTicket(channel, member) {
    const supportEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔧 Support Ticket')
        .setDescription(`Hello ${member.user}! Welcome to your support ticket.\n\nOur team will assist you as soon as possible. Please describe your issue in detail and we'll get back to you shortly.`)
        .addFields(
            { name: '📝 What to include', value: '• Detailed description of your problem\n• Steps you\'ve already tried\n• Screenshots if applicable', inline: false }
        )
        .setFooter({ text: 'Use the close button when your issue is resolved' })
        .setTimestamp();

    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`close_ticket_${channel.id}`)
                .setLabel('🔒 Close Ticket')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        content: `${member.user}`,
        embeds: [supportEmbed],
        components: [closeButton]
    });
}

async function initializePartnershipTicket(channel, member) {
    const tickets = loadTickets();
    tickets[channel.id].partnershipData = {};
    tickets[channel.id].currentStep = 'company_name';
    saveTickets(tickets);

    const partnershipEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🤝 Partnership Application')
        .setDescription(`Hello ${member.user}! Welcome to your partnership application.\n\nI'll guide you through a series of questions to understand your partnership proposal better.`)
        .addFields(
            { name: '📋 Process', value: 'I\'ll ask you questions one by one. Please answer each question thoroughly.', inline: false }
        )
        .setTimestamp();

    await channel.send({ embeds: [partnershipEmbed] });

    // Start the partnership flow
    await askPartnershipQuestion(channel, member, 'company_name');
}

async function initializeJoinTicket(channel, member) {
    const tickets = loadTickets();
    tickets[channel.id].joinData = {};
    tickets[channel.id].currentStep = 'email';
    saveTickets(tickets);

    const joinEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👥 Join the Team Application')
        .setDescription(`Hello ${member.user}! Welcome to your team application.\n\nI'll guide you through our application process with a series of questions.`)
        .addFields(
            { name: '📋 Process', value: 'Please answer each question honestly and thoroughly. This helps us understand how you might fit into our team.', inline: false }
        )
        .setTimestamp();

    await channel.send({ embeds: [joinEmbed] });

    // Start the join flow
    await askJoinQuestion(channel, member, 'email');
}

async function askPartnershipQuestion(channel, member, step) {
    const questions = {
        company_name: 'What is your company/organization name?',
        partnership_need: 'What do you need from this partnership?',
        partnership_offer: 'What can you offer in this partnership?',
        project_link: 'Link to your project/company (website, portfolio, etc.)'
    };

    const questionEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🤝 Partnership Question')
        .setDescription(`**${questions[step]}**\n\nPlease type your answer below:`)
        .setFooter({ text: 'Take your time to provide a detailed answer' })
        .setTimestamp();

    await channel.send({ embeds: [questionEmbed] });
}

async function askJoinQuestion(channel, member, step) {
    const questions = {
        email: 'What is your email address?',
        motivation: 'Why do you want to join our team?',
        role: 'What role are you applying for?',
        knowledge: 'What relevant knowledge do you have?',
        additional: 'Anything else you\'d like us to know?'
    };

    const questionEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👥 Team Application Question')
        .setDescription(`**${questions[step]}**\n\nPlease type your answer below:`)
        .setFooter({ text: 'Provide as much detail as you feel necessary' })
        .setTimestamp();

    await channel.send({ embeds: [questionEmbed] });
}

async function handlePartnershipAnswer(message) {
    const channel = message.channel;
    const member = message.member;
    const answer = message.content;

    const tickets = loadTickets();
    const ticket = tickets[channel.id];

    if (!ticket || ticket.type !== 'partnership') return false;

    const stepOrder = ['company_name', 'partnership_need', 'partnership_offer', 'project_link'];
    const currentStepIndex = stepOrder.indexOf(ticket.currentStep);

    // Save the answer
    ticket.partnershipData[ticket.currentStep] = answer;

    // Delete previous messages (as requested)
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const messagesToDelete = messages.filter(msg => 
            msg.author.id === member.id || 
            (msg.author.bot && msg.embeds.length > 0 && msg.embeds[0].title === '🤝 Partnership Question')
        );
        await channel.bulkDelete(messagesToDelete);
    } catch (error) {
        console.error('Error deleting messages:', error);
    }

    if (currentStepIndex < stepOrder.length - 1) {
        // Move to next question
        const nextStep = stepOrder[currentStepIndex + 1];
        ticket.currentStep = nextStep;
        saveTickets(tickets);
        
        await askPartnershipQuestion(channel, member, nextStep);
    } else {
        // All questions answered, show recap
        await showPartnershipRecap(channel, member, ticket.partnershipData);
    }

    return true;
}

async function handleJoinAnswer(message) {
    const channel = message.channel;
    const member = message.member;
    const answer = message.content;

    const tickets = loadTickets();
    const ticket = tickets[channel.id];

    if (!ticket || ticket.type !== 'join') return false;

    const stepOrder = ['email', 'motivation', 'role', 'knowledge', 'additional'];
    const currentStepIndex = stepOrder.indexOf(ticket.currentStep);

    // Save the answer
    ticket.joinData[ticket.currentStep] = answer;

    // Delete previous messages (as requested)
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const messagesToDelete = messages.filter(msg => 
            msg.author.id === member.id || 
            (msg.author.bot && msg.embeds.length > 0 && msg.embeds[0].title === '👥 Team Application Question')
        );
        await channel.bulkDelete(messagesToDelete);
    } catch (error) {
        console.error('Error deleting messages:', error);
    }

    if (currentStepIndex < stepOrder.length - 1) {
        // Move to next question
        const nextStep = stepOrder[currentStepIndex + 1];
        ticket.currentStep = nextStep;
        saveTickets(tickets);
        
        await askJoinQuestion(channel, member, nextStep);
    } else {
        // All questions answered, show recap
        await showJoinRecap(channel, member, ticket.joinData);
    }

    return true;
}

async function showPartnershipRecap(channel, member, data) {
    const recapEmbed = new EmbedBuilder()
        .setColor('#ff9900')
        .setTitle('🤝 Partnership Application Recap')
        .setDescription('Please review your partnership application:')
        .addFields(
            { name: '🏢 Company/Organization', value: data.company_name || 'Not provided', inline: false },
            { name: '🎯 What you need', value: data.partnership_need || 'Not provided', inline: false },
            { name: '💼 What you offer', value: data.partnership_offer || 'Not provided', inline: false },
            { name: '🔗 Project/Company Link', value: data.project_link || 'Not provided', inline: false }
        )
        .setFooter({ text: 'Please confirm or cancel your application' })
        .setTimestamp();

    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_partnership_${channel.id}`)
                .setLabel('✅ Confirm Application')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cancel_partnership_${channel.id}`)
                .setLabel('❌ Cancel Application')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        embeds: [recapEmbed],
        components: [confirmButtons]
    });
}

async function showJoinRecap(channel, member, data) {
    const recapEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('👥 Team Application Recap')
        .setDescription('Please review your team application:')
        .addFields(
            { name: '📧 Email Address', value: data.email || 'Not provided', inline: false },
            { name: '💭 Motivation', value: data.motivation || 'Not provided', inline: false },
            { name: '👔 Role Applied For', value: data.role || 'Not provided', inline: false },
            { name: '🧠 Relevant Knowledge', value: data.knowledge || 'Not provided', inline: false },
            { name: '💬 Additional Information', value: data.additional || 'Not provided', inline: false }
        )
        .setFooter({ text: 'Please confirm or cancel your application' })
        .setTimestamp();

    const confirmButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`confirm_join_${channel.id}`)
                .setLabel('✅ Confirm Application')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`cancel_join_${channel.id}`)
                .setLabel('❌ Cancel Application')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        embeds: [recapEmbed],
        components: [confirmButtons]
    });
}

module.exports = {
    createTicketChannel,
    handlePartnershipAnswer,
    handleJoinAnswer,
    logAction,
    loadTickets,
    saveTickets
};