# SQL MCP Server

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.18.2-blue.svg)](https://modelcontextprotocol.io/)

A production-ready Model Context Protocol (MCP) server with VS Code extension that enables AI assistants to interact with SQL databases (MySQL, MariaDB, PostgreSQL, SQLite) through natural language queries.

## 🌟 Features

- **🎯 MCP SDK Integration** – Built on `@modelcontextprotocol/sdk` v1.18.2 with full JSON-RPC support
- **🔌 Multi-Database Support** – Unified interface for MySQL/MariaDB, PostgreSQL, and SQLite
- **🛡️ Security First** – Read-only mode by default, prepared statements, identifier sanitization
- **🚀 VS Code Extension** – Interactive configuration wizard with profile management
- **📊 Structured Logging** – Multi-channel logging (stderr, disk, MCP console)
- **🐳 Docker Ready** – Production-optimized containerized deployment
- **🧪 Tested** – Comprehensive integration tests for all drivers

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [VS Code Extension](#vs-code-extension)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Docker Deployment](#docker-deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- **Node.js** ≥ 20.19.0
- One of the following databases:
  - MySQL ≥ 5.7 or MariaDB ≥ 10.3
  - PostgreSQL ≥ 12
  - SQLite ≥ 3.x (bundled `test.db` included for quick trials)
- **VS Code** ≥ 1.80.0 (optional, for extension usage)

## Installation

### Server Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/ahmad5599/mysql-mcp-server.git
cd mysql-mcp-server

# Install dependencies
npm install

# Run tests to verify installation
npm test
\`\`\`

### VS Code Extension Installation

**Option 1: Pre-built VSIX (Recommended)**
\`\`\`bash
# Install the pre-packaged extension
code --install-extension extension/mysql-mcp-extension.vsix
\`\`\`

**Option 2: Build from source**
\`\`\`bash
cd extension
npm install
npx vsce package
code --install-extension mysql-mcp-extension.vsix
\`\`\`

## Quick Start

### 1. Using SQLite (No Setup Required)

\`\`\`bash
# Start with the included test database
MYSQL_MCP_CONNECTION_STRING="sqlite://\$(pwd)/test.db" node server.js
\`\`\`

### 2. Using MySQL/MariaDB

\`\`\`bash
# Connect to MySQL database
MYSQL_MCP_CONNECTION_STRING="mysql://user:password@localhost:3306/database" node server.js
\`\`\`

### 3. Using PostgreSQL

\`\`\`bash
# Connect to PostgreSQL database
MYSQL_MCP_CONNECTION_STRING="postgres://user:password@localhost:5432/database" node server.js
\`\`\`

## VS Code Extension

### Setup Wizard

1. Open Command Palette: \`Ctrl+Shift+P\` (Windows/Linux) or \`Cmd+Shift+P\` (Mac)
2. Type: **"Configure SQL MCP Connection"**
3. Follow the wizard:
   - Select database type (SQLite, MySQL, PostgreSQL)
   - Enter profile name (e.g., "my-production-db")
   - Enter connection string

### Connection String Formats

**SQLite:**
\`\`\`
sqlite:///absolute/path/to/database.db
\`\`\`

**MySQL/MariaDB:**
\`\`\`
mysql://username:password@host:port/database
\`\`\`

**PostgreSQL:**
\`\`\`
postgres://username:password@host:port/database
\`\`\`

### Using in Chat

Once configured, use the MCP tools in your AI chat:

\`\`\`
#mcp_ahmad_sql-gat_list-tables
\`\`\`

\`\`\`
#mcp_ahmad_sql-gat_query query: SELECT * FROM users LIMIT 10
\`\`\`

For complete documentation, see the full README.

## Testing

\`\`\`bash
npm test
\`\`\`

## Security

- ✅ Read-only mode by default
- ✅ Prepared statements
- ✅ Identifier sanitization
- ✅ Automatic row limits

## License

MIT License - see [LICENSE](./LICENSE) file for details.
