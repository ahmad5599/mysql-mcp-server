const express = require('express');
const pkg = require('../package.json');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { ConnectionManager } = require('./db/connection-manager');
const { buildTools } = require('./mcp/tools');
const { buildResources } = require('./mcp/resources');

async function startStdIoServer({ server, logger }) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await logger.info('STDIO transport ready');
}

function createHttpServer({ tools, resources, config, logger }) {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const { tool, parameters } = req.body;
    const target = tools.find((t) => t.name === tool);
    if (!target) {
      return res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
    if (config.readOnly && !['read', 'metadata', 'connect'].includes(target.operationType)) {
      return res.status(403).json({ error: 'Operation disabled in read-only mode' });
    }
    try {
      const result = await target.handler(parameters || {});
      res.json({ result });
    } catch (error) {
      logger.error(`HTTP tool error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/mcp/resources', async (req, res) => {
    const resource = resources.find((item) => item.uri === req.query.uri);
    if (!resource) {
      return res.status(400).json({ error: 'Unknown resource' });
    }
    try {
      const data = await resource.get();
      res.json({ result: data });
    } catch (error) {
      logger.error(`HTTP resource error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}

function mapToolForSchema(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  };
}

function mapResourceForSchema(resource) {
  return {
    uri: resource.uri,
    mimeType: 'application/json',
    name: resource.name,
    description: resource.description,
  };
}

async function startServer() {
  const config = loadConfig();
  const logger = createLogger(config);
  const connectionManager = new ConnectionManager(config, logger);

  if (config.connectionString) {
    try {
      await connectionManager.connect(config.connectionString);
    } catch (error) {
      await logger.error(`Auto-connect failed: ${error.message}`);
    }
  }

  const tools = buildTools({ connectionManager, config, logger });
  const resources = buildResources({ connectionManager, config });

  if (config.transport === 'http') {
    const app = createHttpServer({ tools, resources, config, logger });
    app.listen(config.httpPort, config.httpHost, () => {
      logger.info(`HTTP server listening on http://${config.httpHost}:${config.httpPort}`);
    });
    return;
  }

  const server = new Server(
    {
      name: 'mysql-mcp-server',
      version: pkg.version || '0.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools
      .filter((tool) => !config.readOnly || ['read', 'metadata', 'connect'].includes(tool.operationType))
      .map(mapToolForSchema),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const tool = tools.find((item) => item.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    if (config.readOnly && !['read', 'metadata', 'connect'].includes(tool.operationType)) {
      throw new Error('Operation disabled in read-only mode');
    }
    const result = await tool.handler(args);
    return { content: [{ type: 'json', json: result }] };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.map(mapResourceForSchema),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = resources.find((item) => item.uri === request.params.uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }
    const data = await resource.get();
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  });

  await startStdIoServer({ server, logger });
}

module.exports = { startServer };

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  });
}
