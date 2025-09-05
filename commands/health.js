const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('health')
        .setDescription('Check bot health status and API connectivity'),
    
    async execute(interaction) {
        // Reply immediately with initial status
        const startTime = Date.now();
        const initialEmbed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('🏥 System Health Status')
            .setDescription('Checking system status...')
            .setTimestamp();
            
        await interaction.reply({ embeds: [initialEmbed] });
        
        // Check bot ping
        const botPing = Math.round(interaction.client.ws.ping);
        const responseTime = Date.now() - startTime;
        
        // Check API connectivity
        let apiStatus = 'Unknown';
        let apiPing = 'N/A';
        let apiService = 'Unknown';
        let apiError = null;
        
        try {
            const apiStartTime = Date.now();
            const response = await axios.get('http://139.28.99.175:52841/health', {
                timeout: 5000
            });
            
            const apiResponseTime = Date.now() - apiStartTime;
            
            if (response.status === 200 && response.data.status === 'ok') {
                apiStatus = '🟢 Online';
                apiPing = `${apiResponseTime}ms`;
                apiService = response.data.service || 'Unknown';
            } else {
                apiStatus = '🟡 Partial';
                apiPing = `${apiResponseTime}ms`;
            }
        } catch (error) {
            apiStatus = '🔴 Offline';
            apiError = error.code || error.message;
        }
        
        // Create health embed
        const healthEmbed = new EmbedBuilder()
            .setColor(apiStatus.includes('🟢') ? '#00ff00' : apiStatus.includes('🟡') ? '#ffff00' : '#ff0000')
            .setTitle('🏥 System Health Status')
            .setDescription('Current status of bot and connected services')
            .addFields(
                { name: '🤖 Bot Status', value: '🟢 Online', inline: true },
                { name: '📡 Bot Ping', value: `${botPing}ms`, inline: true },
                { name: '⚡ Response Time', value: `${responseTime}ms`, inline: true },
                { name: '🔗 API Backend', value: apiStatus, inline: true },
                { name: '📊 API Ping', value: apiPing, inline: true },
                { name: '🏷️ Service', value: apiService, inline: true }
            )
            .setFooter({ text: apiError ? `Error: ${apiError}` : 'All systems checked' })
            .setTimestamp();
        
        try {
            await interaction.editReply({ embeds: [healthEmbed] });
        } catch (error) {
            console.error('Error updating health status:', error);
            // If we can't edit the reply, the interaction might have expired
            // We'll just log the error and not try to send another message
        }
    },
};