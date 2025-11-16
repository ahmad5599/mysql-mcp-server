const vscode = require('vscode');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const JSON5 = require('json5');

function getMcpConfigPath() {
  const home = os.homedir();
  return process.platform === 'win32' ? path.join(home, 'AppData', 'Roaming', 'Code', 'User', 'mcp.json') : path.join(home, '.config', 'Code', 'User', 'mcp.json');
}

function activate(context) {
  console.log('MySQL MCP Server extension activated');
  let serverProcess = null;

  const configPath = getMcpConfigPath();
  const serverPath = path.join(context.extensionPath, 'server.js');

  const readMcpConfig = async () => {
    try {
      const raw = await fs.readFile(configPath, 'utf8');
      try {
        return JSON.parse(raw);
      } catch (_) {
        return JSON5.parse(raw);
      }
    } catch (e) {
      return {};
    }
  };

  const writeMcpConfig = async (obj) => {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(obj, null, 2));
  };

  const configureCommand = vscode.commands.registerCommand('mysql-mcp.configure', async () => {
    const connectionString = await vscode.window.showInputBox({
      prompt: 'Enter SQL connection string (e.g., mysql://user:pass@localhost:3306/db, postgres://, sqlite://)',
      password: true,
      placeHolder: 'e.g., sqlite:///home/muhammadahmadhamid/Documents/mysql-mcp-server/test.db'
    });
    if (!connectionString) return;

    let mcpConfig = await readMcpConfig();
    if (!mcpConfig.servers) mcpConfig.servers = {};

    mcpConfig.servers['mysql/mysql-mcp-server'] = {
      type: 'stdio',
      command: 'node',
      args: [serverPath, '--readOnly'],
      env: {
        MYSQL_MCP_CONNECTION_STRING: connectionString,
        ...process.env // Inherit existing environment
      }
    };

    try {
      await writeMcpConfig(mcpConfig);
      vscode.window.showInformationMessage('MySQL MCP Server configured');
      // Restart the server if running
      if (serverProcess) {
        serverProcess.kill();
        startServerProcess();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save config: ${error.message}`);
    }
  });

// In extension/extension.js, update the startServerProcess function
const startServerProcess = () => {
  if (serverProcess) serverProcess.kill();
  readMcpConfig().then(config => {
    const serverConfig = config.servers?.['mysql/mysql-mcp-server'];
    if (serverConfig && serverConfig.env?.MYSQL_MCP_CONNECTION_STRING) {
      serverProcess = spawn(serverConfig.command, serverConfig.args, {
        env: serverConfig.env,
        stdio: ['pipe', 'pipe', process.stderr] // Pipe stdout to parent, stderr to console
      });
      if (serverProcess) {
        serverProcess.stdout.on('data', (data) => {
          console.log(`Server stdout: ${data}`);
          process.stdout.write(data);
        });
        serverProcess.stderr.on('data', (data) => console.error(`Server stderr: ${data}`));
        serverProcess.on('error', (error) => console.error(`Server error: ${error.message}`));
        serverProcess.on('exit', (code) => console.log(`Server exited with code ${code}`));
      } else {
        console.error('Failed to spawn server process');
      }
    } else {
      console.error('Server config or connection string missing');
    }
  }).catch(error => {
    console.error(`Error reading MCP config: ${error.message}`);
  });
};

  // Start server on activation
  startServerProcess();

  context.subscriptions.push(configureCommand);

  readMcpConfig().then(async (config) => {
    const hasModern = !!(config.servers && config.servers['mysql/mysql-mcp-server']);
    if (!hasModern) {
      vscode.window.showInformationMessage(
        'MySQL MCP Server requires a connection string. Configure now?',
        'Configure'
      ).then(selection => {
        if (selection === 'Configure') {
          vscode.commands.executeCommand('mysql-mcp.configure');
        }
      });
    }
  });
}

function deactivate() {
  if (serverProcess) serverProcess.kill();
  console.log('MySQL MCP Server extension deactivated');
}

module.exports = { activate, deactivate };