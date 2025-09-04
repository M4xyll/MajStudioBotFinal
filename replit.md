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
- **Live API Integration**: Real-time order retrieval from external server API
- **GET Request System**: Makes HTTP requests to `/order/{orderCode}` endpoint on your server
- **Comprehensive Error Handling**: Handles API timeouts, connection errors, and invalid responses
- **Dynamic Order Display**: Shows order status, items, customer info, and shipping details
- **User-Friendly Feedback**: Clear error messages for order not found, server issues, etc.

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
- **axios**: HTTP client for API requests to external order management system
- **express**: Web server framework for potential webhook endpoints
- **fs/path**: Native Node.js modules for file system operations

## API Integration
- **Order API**: Integrates with external server for real-time order retrieval
- **Expected API Response Format**: JSON with order details including status, items, customer info
- **Error Handling**: Comprehensive handling of network errors, timeouts, and API failures
- **Security**: API requests include proper headers and timeout configurations

## API Configuration Required
To enable order retrieval, set the ORDER_API_URL environment variable to your server's API endpoint. The bot will make GET requests to `{ORDER_API_URL}/order/{orderCode}`.

**Expected API Response Format:**
```json
{
  "status": "shipped",
  "total": "99.99",
  "created_at": "2024-01-15T10:30:00Z",
  "items": [
    {"name": "Product Name", "quantity": 1, "price": "99.99"}
  ],
  "customer": {"name": "John Doe", "email": "john@example.com"},
  "shipping_status": "In transit"
}
```

**API Requirements:**
- Must respond to GET requests on `/order/{orderCode}` endpoint
- Return 404 status for orders not found
- Return 200 status with JSON data for valid orders
- Support CORS if bot and API are on different domains

## Development Tools
- **package.json**: Dependency management and project metadata
- **deploy-commands.js**: Automated command deployment script for Discord API registration
- **Modular File Structure**: Organized codebase for easy maintenance and feature expansion