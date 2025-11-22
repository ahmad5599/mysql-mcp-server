const { spawn } = require('child_process');

class ServerManager {
  constructor(serverPath, logger) {
    this.serverPath = serverPath;
    this.logger = logger;
    this.child = null;
  }

  start(envOverrides = {}) {
    this.stop();
    const env = { ...process.env, ...envOverrides };
    this.child = spawn('node', [this.serverPath], {
      env,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    this.child.on('exit', (code) => {
      this.logger.appendLine(`MCP server exited with code ${code}`);
    });
  }

  stop() {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }
}

module.exports = { ServerManager };
