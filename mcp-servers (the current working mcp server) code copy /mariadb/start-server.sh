#!/bin/bash

cd "$(dirname "$0")" || exit 1

export MYSQL_HOST='localhost'
export MYSQL_PORT=3306
export MYSQL_DATABASE='nest'
export MYSQL_USER='root'
export MYSQL_PASSWORD='1234'

# Optional: log that it started (must come BEFORE exec)
echo "$(date): mariadb MCP server starting..." >> /tmp/mcp-debug.log

# Launch the server
exec /usr/bin/node index.js