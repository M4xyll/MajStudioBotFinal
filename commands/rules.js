const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Display the server rules with acceptance button')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        // Check if user has administrator permission or manage messages permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                content: '❌ You don\'t have permission to use this command. Only staff members can send the rules panel.',
                ephemeral: true
            });
            return;
        }
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