const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { handlePartnershipAnswer, handleJoinAnswer, logAction } = require('../handlers/ticketHandler');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if this is a ticket channel and handle answers
        const ticketsPath = path.join('./data', 'tickets.json');
        let tickets = {};
        
        try {
            tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
        } catch (error) {
            // File doesn't exist or is invalid, use empty object
        }

        if (tickets[message.channel.id]) {
            const ticket = tickets[message.channel.id];
            
            // Handle partnership answers
            if (ticket.type === 'partnership' && ticket.currentStep) {
                const handled = await handlePartnershipAnswer(message);
                if (handled) return;
            }
            
            // Handle join team answers
            if (ticket.type === 'join' && ticket.currentStep) {
                const handled = await handleJoinAnswer(message);
                if (handled) return;
            }
        }
    },
};