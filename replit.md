# Maj Studio Discord Bot

A comprehensive Discord bot for Maj Studio that provides order management, ticket system, rules management, and health monitoring features.

## Project Overview

This Discord bot is built with discord.js v14 and includes:
- **Order Management System**: Retrieve order data from API and create order tickets
- **Ticket System**: Support, partnership, and team application tickets
- **Order Tickets**: Special order-specific tickets with refresh functionality
- **Rules System**: Automated rule acceptance with role assignment
- **Health Monitoring**: API health checks and monitoring
- **Voice Channel Management**: Temporary voice channels
- **Logging System**: Comprehensive action logging

## Recent Changes (September 2025)

### Order System Enhancements
- **Enhanced Order Status**: "Check Status" button now displays complete order data from API
- **Order Ticket Creation**: Added "Create Order Ticket" button after order retrieval
- **Order Refresh Command**: New `/orders refresh` command to update order data in tickets
- **API Integration**: Updated to handle new API response format with payment status, customer info, etc.
- **Order Categories**: Added support for order-specific ticket categories

### New Features
- Order tickets are created in a dedicated category
- Order tickets display comprehensive order information
- Real-time order data refresh in ticket channels
- Improved error handling for API connectivity

## User Preferences

### Coding Style
- Clean, readable code with proper error handling
- Comprehensive logging for all bot actions
- Modular structure with separated concerns
- Discord.js v14 best practices

### Workflow Preferences
- Console-based bot operation (not web-based)
- Environment variable configuration
- JSON-based configuration files
- Automated command deployment

## Project Architecture

### Core Components
- **bot.js**: Main bot entry point and initialization
- **commands/**: Slash command definitions
  - `orders.js`: Order management with panel and refresh subcommands
  - `health.js`: Bot and API health monitoring
  - `tickets.js`: Ticket system management
  - `rules.js`: Server rules display and acceptance
  - `admin.js`: Administrative commands
- **events/**: Discord event handlers
  - `interactionCreate.js`: All button, modal, and command interactions
  - `guildMemberAdd.js`: Welcome messages
  - `messageCreate.js`: Message monitoring
- **handlers/**: Specialized handlers
  - `ticketHandler.js`: Ticket creation and management
- **utils/**: Utility functions
  - `logger.js`: Centralized logging system
  - `healthChecker.js`: API health monitoring

### Configuration
- **config.json**: Discord IDs, channels, roles, rules, and API endpoints
- **.env**: Secret tokens and sensitive configuration
- **Environment Variables**:
  - `DISCORD_TOKEN`: Bot authentication token
  - `CLIENT_ID`: Discord application client ID
  - `GUILD_ID`: Target Discord server ID
  - `ORDER_API_URL`: Order management API endpoint

### Order System Flow
1. User clicks "Check Status" or "Retrieve Order" buttons
2. Modal prompts for order code
3. Bot fetches data from API endpoint
4. Displays order information with "Create Order Ticket" button
5. Order ticket created in designated category
6. `/orders refresh` command updates ticket data
7. Ticket can be closed with transcript generation

### API Integration
- Order endpoint: `GET /order/{orderCode}`
- Expected response format includes: status, payment_status, total_amount, customer info
- Handles network errors and API unavailability gracefully
- Logs all API interactions for monitoring

## Dependencies
- discord.js ^14.22.1
- axios ^1.11.0
- dotenv ^17.2.2
- express ^5.1.0

## Setup Requirements
1. Discord bot token and application setup
2. Guild ID and channel/role configuration
3. Order API endpoint configuration
4. Category setup for order tickets

## Current Status
- All core functionality implemented and tested
- Order system enhanced with ticket creation and refresh
- Ready for deployment with proper environment configuration