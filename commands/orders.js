const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('orders')
        .setDescription('Display the order management panel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
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
    },
};