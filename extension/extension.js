const vscode = require('vscode');
const path = require('path');
const { DRIVER_OPTIONS, SERVER_ID_PREFIX } = require('./src/constants');
const { getMcpConfigPath, readJson, writeJson } = require('./src/utils');
const { ServerManager } = require('./src/server-manager');

function getServerEntryPath() {
  try {
    return require.resolve('mysql-mcp-server/server.js');
  } catch (error) {
    throw new Error('mysql-mcp-server dependency is missing. Run npm install inside the extension folder.');
  }
}

function buildServerId(profileName) {
  return `${SERVER_ID_PREFIX}/${profileName}`;
}

async function pickDriver() {
  const selection = await vscode.window.showQuickPick(
    DRIVER_OPTIONS.map((driver) => ({
      label: driver.label,
      description: driver.connectionHint,
      value: driver.value,
    })),
    { placeHolder: 'Select the SQL database type you want to connect to' }
  );
  return selection?.value;
}

async function promptProfileName(defaultName) {
  const name = await vscode.window.showInputBox({
    title: 'Profile Name',
    prompt: 'Provide a name for this database profile',
    value: defaultName,
    validateInput: (value) => (!value ? 'Profile name is required' : undefined),
  });
  return name?.trim();
}

async function promptConnectionString(driverValue) {
  const driver = DRIVER_OPTIONS.find((item) => item.value === driverValue);
  const connectionString = await vscode.window.showInputBox({
    title: `Connection string for ${driver?.label ?? driverValue}`,
    prompt: 'Enter a SQL connection string (kept locally in your mcp.json)',
    placeHolder: driver?.connectionHint,
    validateInput: (value) => (!value ? 'Connection string is required' : undefined),
  });
  return connectionString?.trim();
}

async function upsertServerConfig({ profileName, connectionString, readOnly = true }) {
  const mcpConfigPath = getMcpConfigPath();
  const mcpConfig = await readJson(mcpConfigPath);
  mcpConfig.servers = mcpConfig.servers || {};
  const serverId = buildServerId(profileName);
  mcpConfig.servers[serverId] = {
    type: 'stdio',
    command: 'node',
    args: [getServerEntryPath()],
    env: {
      MYSQL_MCP_CONNECTION_STRING: connectionString,
      MYSQL_MCP_READ_ONLY: String(readOnly),
      ...process.env,
    },
  };
  await writeJson(mcpConfigPath, mcpConfig);
  return serverId;
}

async function showStatus(outputChannel) {
  const mcpConfigPath = getMcpConfigPath();
  const mcpConfig = await readJson(mcpConfigPath);
  const entries = Object.entries(mcpConfig.servers || {}).filter(([key]) => key.startsWith(SERVER_ID_PREFIX));
  if (entries.length === 0) {
    vscode.window.showInformationMessage('No SQL MCP connections configured yet.');
    return;
  }
  outputChannel.appendLine('Configured SQL MCP connections:');
  entries.forEach(([id, value]) => {
    outputChannel.appendLine(`- ${id}: ${value.env?.MYSQL_MCP_CONNECTION_STRING ? '[configured]' : '[missing connection string]'}`);
  });
  outputChannel.show(true);
}

function activate(context) {
  const output = vscode.window.createOutputChannel('SQL MCP');
  const serverManager = new ServerManager(getServerEntryPath(), output);

  const configureCommand = vscode.commands.registerCommand('mysql-mcp.configure', async () => {
    try {
      const driver = await pickDriver();
      if (!driver) {
        return;
      }
      const profileName = await promptProfileName(`${driver}-profile`);
      if (!profileName) {
        return;
      }
      const connectionString = await promptConnectionString(driver);
      if (!connectionString) {
        return;
      }

      const serverId = await upsertServerConfig({ profileName, connectionString });
      output.appendLine(`Updated MCP config with profile '${profileName}' (${serverId}).`);
      vscode.window.showInformationMessage(`SQL MCP profile '${profileName}' configured.`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to configure SQL MCP: ${error.message}`);
      output.appendLine(`Error configuring SQL MCP: ${error.message}`);
    }
  });

  const statusCommand = vscode.commands.registerCommand('mysql-mcp.showStatus', () => showStatus(output));

  context.subscriptions.push(configureCommand, statusCommand, output);

  // Attempt to start a default profile automatically if present
  (async () => {
    const mcpConfigPath = getMcpConfigPath();
    const mcpConfig = await readJson(mcpConfigPath);
    const defaultEntry = Object.entries(mcpConfig.servers || {}).find(([key]) => key.startsWith(SERVER_ID_PREFIX));
    if (defaultEntry) {
      const [, value] = defaultEntry;
      serverManager.start(value.env || {});
    }
  })().catch((error) => {
    output.appendLine(`Failed to auto-start SQL MCP server: ${error.message}`);
  });

  context.subscriptions.push({
    dispose: () => serverManager.stop(),
  });
}

function deactivate() {}

module.exports = { activate, deactivate };