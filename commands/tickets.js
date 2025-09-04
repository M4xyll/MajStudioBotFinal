const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Display the ticket creation panel'),
    
    async execute(interaction) {
        const ticketEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎫 Maj Studio - Support Center')
            .setDescription('Welcome to our support center! Please select the type of assistance you need:\n\n🔧 **Support** - Get help with technical issues or general questions\n🤝 **Partnership** - Propose a business partnership or collaboration\n👥 **Join the Team** - Apply to join our development team')
            .setFooter({ text: 'Click one of the buttons below to create a ticket' })
            .setTimestamp();

        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_support')
                    .setLabel('🔧 Support')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_partnership')
                    .setLabel('🤝 Partnership')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_join')
                    .setLabel('👥 Join the Team')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({
            embeds: [ticketEmbed],
            components: [ticketButtons]
        });
    },
};