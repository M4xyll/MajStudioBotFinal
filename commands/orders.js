const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const config = require('../config.json');
const { logAction } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('orders')
        .setDescription('Order management commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Display the order management panel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('refresh')
                .setDescription('Refresh order data in this order ticket'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'panel') {
            // Check if user has administrator permission or manage messages permission
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                await interaction.reply({
                    content: '❌ You don\'t have permission to use this command. Only staff members can send the order panel.',
                    ephemeral: true
                });
                return;
            }
            
            const orderEmbed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('📦 Order Management')
                .setDescription('**Order Retrieval System**\n\nUse this panel to retrieve and manage your orders from our website. You\'ll need your order code to access the information.\n\n**How it works:**\n1. Click the "Retrieve Order" button below\n2. Enter your order code when prompted\n3. View your order details and status')
                .addFields(
                    { name: '📋 Order Information', value: 'Get details about your order status, items, and delivery', inline: true },
                    { name: '🔄 Status Updates', value: 'Track your order progress in real-time', inline: true },
                    { name: '💬 Support', value: 'Get help with your order if needed', inline: true }
                )
                .setFooter({ text: 'Make sure you have your order code ready' })
                .setTimestamp();

            const orderButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('order_retrieve')
                        .setLabel('📦 Retrieve Order')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('order_status')
                        .setLabel('📊 Check Status')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                embeds: [orderEmbed],
                components: [orderButtons]
            });

        } else if (subcommand === 'refresh') {
            // Check if this is an order ticket channel
            const channelName = interaction.channel.name;
            if (!channelName || !channelName.startsWith('order-')) {
                await interaction.reply({
                    content: '❌ This command can only be used in order ticket channels.',
                    ephemeral: true
                });
                return;
            }

            // Extract order code from channel name
            const orderCode = channelName.replace('order-', '');
            
            await interaction.deferReply();

            try {
                // Get API endpoint from environment variables or config
                const apiUrl = process.env.ORDER_API_URL || config.api.orderEndpoint;
                
                if (!apiUrl) {
                    await interaction.editReply('❌ Order API URL is not configured. Please contact an administrator.');
                    return;
                }

                // Make API request to get updated order information
                const response = await axios.get(`${apiUrl}/order/${orderCode}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Maj-Studio-Discord-Bot/1.0'
                    },
                    timeout: 10000
                });

                if (response.status === 200 && response.data) {
                    const orderData = response.data;
                    
                    // Create updated embed
                    const orderEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle(`📦 Order ${orderCode} (Refreshed)`)
                        .setDescription(`Updated order details`)
                        .addFields(
                            { name: '📋 Status', value: orderData.status || 'Unknown', inline: true },
                            { name: '💳 Payment Status', value: orderData.payment_status || 'Unknown', inline: true },
                            { name: '💰 Total Amount', value: `${orderData.total_amount || 0} ${orderData.currency || 'EUR'}`, inline: true },
                            { name: '💳 Payment Method', value: orderData.payment_method || 'Unknown', inline: true },
                            { name: '👤 Customer', value: orderData.customer?.name || 'Unknown', inline: true },
                            { name: '📧 Email', value: orderData.customer?.email || 'Unknown', inline: true },
                            { name: '💬 Discord', value: orderData.customer?.discord || 'Unknown', inline: true },
                            { name: '📅 Created', value: orderData.created_at ? new Date(orderData.created_at).toLocaleString() : 'Unknown', inline: true },
                            { name: '🔄 Updated', value: orderData.updated_at ? new Date(orderData.updated_at).toLocaleString() : 'Unknown', inline: true }
                        )
                        .setFooter({ text: `Refreshed by ${interaction.user.tag} at ${new Date().toLocaleString()}` })
                        .setTimestamp();

                    const closeButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`close_order_ticket_${interaction.channel.id}`)
                                .setLabel('🔒 Close Ticket')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interaction.editReply({
                        content: '✅ **Order data refreshed successfully!**',
                        embeds: [orderEmbed],
                        components: [closeButton]
                    });

                    logAction('ORDER_REFRESHED', {
                        orderCode: orderCode,
                        channelId: interaction.channel.id,
                        userId: interaction.user.id,
                        userTag: interaction.user.tag,
                        orderStatus: orderData.status
                    });

                } else {
                    throw new Error('Invalid response from API');
                }

            } catch (error) {
                console.error('Error refreshing order:', error);
                
                let errorMessage = 'Failed to refresh order information.';
                if (error.response?.status === 404) {
                    errorMessage = `Order ${orderCode} not found.`;
                } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                    errorMessage = 'Cannot connect to order API.';
                }

                await interaction.editReply(`❌ ${errorMessage} Please try again later or contact an administrator.`);

                logAction('ORDER_REFRESH_ERROR', {
                    orderCode: orderCode,
                    channelId: interaction.channel.id,
                    userId: interaction.user.id,
                    userTag: interaction.user.tag,
                    error: error.message
                });
            }
        }
    },
};