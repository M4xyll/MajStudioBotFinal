const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Display the server rules with acceptance button'),
    
    async execute(interaction) {
        // Create the rules embed
        const rulesEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(config.messages.rulesTitle)
            .setDescription(config.rules.map((rule, index) => `${rule}`).join('\n\n'))
            .setFooter({ text: config.messages.rulesFooter })
            .setTimestamp();

        // Create the accept button
        const acceptButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_rules')
                    .setLabel('✅ Accept Rules')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({
            embeds: [rulesEmbed],
            components: [acceptButton]
        });
    },
};