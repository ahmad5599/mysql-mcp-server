const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs').promises;
const path = require('path');

function activate(context) {
  console.log('MySQL MCP Server extension activated');

  // Install the server
  try {
    cp.execSync('npm install -g mysql-mcp-server@latest', { stdio: 'inherit' });
    vscode.window.showInformationMessage('MySQL MCP Server installed');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to install mysql-mcp-server: ${error.message}`);
    return;
  }

  // MCP config path (supports VS Code and Cursor)
  const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.cursor', 'mcp.json');

  // Command to configure connection string
  const configureCommand = vscode.commands.registerCommand('mysql-mcp.configure', async () => {
    const connectionString = await vscode.window.showInputBox({
      prompt: 'Enter SQL connection string (e.g., mysql://user:pass@localhost:3306/db, postgres://, sqlite://)',
      password: true,
      placeHolder: 'e.g., mysql://user:pass@localhost:3306/db'
    });
    if (!connectionString) return;

    let mcpConfig = { mcpServers: {} };
    try {
      const existingConfig = await fs.readFile(configPath, 'utf8');
      mcpConfig = JSON.parse(existingConfig);
    } catch (error) {
      // Config file doesn't exist yet, create new
    }

    mcpConfig.mcpServers.MySQL = {
      command: 'mysql-mcp-server',
      args: ['--readOnly'],
      env: {
        MYSQL_MCP_CONNECTION_STRING: connectionString
      }
    };

    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2));
      vscode.window.showInformationMessage('MySQL MCP Server configured');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save config: ${error.message}`);
    }
  });

  context.subscriptions.push(configureCommand);

  // Prompt for config on first activation if no MySQL config exists
  fs.readFile(configPath, 'utf8').catch(() => '{}').then(async (data) => {
    const config = JSON.parse(data);
    if (!config.mcpServers?.MySQL) {
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
  console.log('MySQL MCP Server extension deactivated');
}

module.exports = { activate, deactivate };