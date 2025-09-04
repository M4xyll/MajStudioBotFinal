require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = require('./config.json');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize data storage
const dataPath = './data';
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
}

// Initialize persistent data files
const initializeDataFiles = () => {
    const defaultData = {
        tickets: {},
        tempChannels: {},
        orders: {},
        logs: []
    };
    
    const dataFiles = ['tickets.json', 'tempChannels.json', 'orders.json', 'logs.json'];
    
    dataFiles.forEach(file => {
        const filePath = path.join(dataPath, file);
        if (!fs.existsSync(filePath)) {
            const fileName = file.split('.')[0];
            fs.writeFileSync(filePath, JSON.stringify(defaultData[fileName] || {}, null, 2));
        }
    });
};

// Import centralized logger
const { logAction, setBotClient } = require('./utils/logger');

// Initialize collections
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

// Basic ready event
client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Maj Studio Bot is ready! Logged in as ${readyClient.user.tag}`);
    
    // Set bot client for centralized logger
    setBotClient(readyClient);
    
    logAction('BOT_READY', { botTag: readyClient.user.tag, timestamp: new Date().toISOString() });
});

// Basic error handling
client.on('error', error => {
    console.error('❌ Client error:', error);
    logAction('BOT_ERROR', { error: error.message, stack: error.stack });
});

client.on('warn', warning => {
    console.warn('⚠️ Client warning:', warning);
    logAction('BOT_WARNING', { warning });
});

// Initialize data files
initializeDataFiles();

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN not found in environment variables!');
    console.log('ℹ️ Please set your Discord bot token in the environment variables.');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('❌ Failed to login:', error);
    logAction('BOT_LOGIN_ERROR', { error: error.message });
    process.exit(1);
});

module.exports = client;