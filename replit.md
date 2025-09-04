# Overview

This is a comprehensive Discord bot built for "Maj Studio" using Node.js and Discord.js v14. The bot provides a complete server management solution with five core features: a rule acceptance system, temporary voice channel creation, order management integration with external websites, a multi-type ticket system, and comprehensive logging. The bot is designed to handle server moderation, member onboarding, customer support, and business operations all within Discord.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **Discord.js v14**: Core Discord API wrapper for handling bot interactions
- **Slash Commands**: Modern Discord command system with subcommands for admin operations
- **Event-Driven Architecture**: Separate event handlers for different Discord events (member join/leave, voice state updates, message creation, interactions)
- **Component-Based Design**: Modular structure with separate handlers for tickets, commands, and events

## Data Storage
- **File-Based Persistence**: JSON files stored in `/data` directory instead of traditional database
- **Four Data Files**: `tickets.json`, `tempChannels.json`, `orders.json`, and `logs.json`
- **Auto-Recovery**: Automatic data file initialization on startup to handle missing files
- **Log Rotation**: Built-in log management with 1000-entry limit to prevent file bloat

## Configuration Management
- **Environment Variables**: Sensitive data (Discord tokens, IDs) stored in `.env` file
- **Static Configuration**: Server settings, rules, and messages stored in `config.json`
- **Hot-Swappable Settings**: Configuration can be modified without code changes

## Feature Architecture

### Rule System
- Interactive embed with acceptance button
- Role assignment upon rule acceptance
- Duplicate role prevention logic

### Temporary Voice Channels
- Voice state monitoring for trigger channel joins
- Dynamic channel creation with user-specific naming
- Automatic cleanup when channels become empty
- Permission inheritance from parent category

### Ticket System
- Three ticket types: Support, Partnership, Join Team
- Multi-step conversation flows for Partnership and Join Team tickets
- State management for conversation tracking
- Message cleanup between conversation steps
- Confirmation flows with cancel/proceed options

### Order Management
- Webhook-ready architecture for external website integration
- Order retrieval panel with button interactions
- Expandable for future e-commerce integrations

### Logging System
- Comprehensive event tracking (joins, leaves, rule acceptance, tickets, messages)
- Structured log entries with timestamps and detailed context
- Performance considerations with log rotation

## Command Structure
- **Admin Commands**: Channel and user management with permission restrictions
- **Public Commands**: Rules display, ticket creation, order management
- **Slash Command Architecture**: Modern Discord interaction system with proper error handling

## Error Handling
- Try-catch blocks around critical operations
- Graceful degradation when data files are missing or corrupted
- User-friendly error messages with embed formatting
- Comprehensive error logging for debugging

# External Dependencies

## Discord Integration
- **Discord.js v14**: Primary bot framework and API wrapper
- **Discord Developer Portal**: Bot token and application management
- **Guild-Specific Deployment**: Commands deployed per-server for better performance

## Node.js Ecosystem
- **dotenv**: Environment variable management for sensitive configuration
- **axios**: HTTP client for future webhook integrations with external websites
- **express**: Web server framework for potential webhook endpoints
- **fs/path**: Native Node.js modules for file system operations

## Future Integrations
- **Webhook System**: Prepared infrastructure for external website order integration
- **E-commerce Platform**: Order management system designed for external API connections
- **Transcript Services**: Architecture supports future transcript generation for ticket conversations

## Development Tools
- **package.json**: Dependency management and project metadata
- **deploy-commands.js**: Automated command deployment script for Discord API registration
- **Modular File Structure**: Organized codebase for easy maintenance and feature expansion