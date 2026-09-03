import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import "./config.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerUserTools } from "./tools/users.js";
import { registerWorkPackageTools } from "./tools/work-packages.js";

function createServer(): McpServer {
    const server = new McpServer({
        name: "openproject-mcp",
        version: "1.0.0",
    });

    registerUserTools(server);
    registerProjectTools(server);
    registerWorkPackageTools(server);

    return server;
}

serveStdio(createServer, {
    onerror: (error) => console.error(error),
});

console.error("openproject-mcp running on stdio");
