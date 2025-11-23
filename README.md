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

**Option 1: Install from npm (Recommended)**
\`\`\`bash
npm install -g @ahmad3244/sql-mcp-server
# Or use without installing
npx @ahmad3244/sql-mcp-server
\`\`\`

**Option 2: Install from GitHub Release**
\`\`\`bash
npm install https://github.com/ahmad5599/mysql-mcp-server/releases/download/v1.0.0/mysql-mcp-server-1.0.0.tgz
\`\`\`

**Option 3: Clone and build from source**
\`\`\`bash
git clone https://github.com/ahmad5599/mysql-mcp-server.git
cd mysql-mcp-server
npm install
npm test
\`\`\`

### VS Code Extension Installation

**Option 1: Download from GitHub Release (Recommended)**
\`\`\`bash
# Download the VSIX
wget https://github.com/ahmad5599/mysql-mcp-server/releases/download/v1.0.0/sql-mcp-extension-1.0.0.vsix

# Install the extension
code --install-extension sql-mcp-extension-1.0.0.vsix
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
# If installed globally
MYSQL_MCP_CONNECTION_STRING="sqlite:///path/to/database.db" mysql-mcp-server

# Using npx
MYSQL_MCP_CONNECTION_STRING="sqlite:///path/to/database.db" npx @ahmad3244/sql-mcp-server

# From source
MYSQL_MCP_CONNECTION_STRING="sqlite://\$(pwd)/test.db" node server.js
\`\`\`

### 2. Using MySQL/MariaDB

\`\`\`bash
MYSQL_MCP_CONNECTION_STRING="mysql://user:password@localhost:3306/database" npx @ahmad3244/sql-mcp-server
\`\`\`

### 3. Using PostgreSQL

\`\`\`bash
MYSQL_MCP_CONNECTION_STRING="postgres://user:password@localhost:5432/database" npx @ahmad3244/sql-mcp-server
\`\`\`

### 4. Using Docker

\`\`\`bash
docker run --rm \\
  -e MYSQL_MCP_CONNECTION_STRING="mysql://user:pass@host.docker.internal:3306/db" \\
  ahmad5599/sql-mcp-server:latest
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
