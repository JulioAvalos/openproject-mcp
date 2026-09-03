# openproject-mcp

A Model Context Protocol (MCP) server that exposes OpenProject as tools for Claude Code (and other MCP clients), over stdio.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root:

```bash
OPENPROJECT_URL="https://your-openproject-instance.example.com"
OPENPROJECT_API_KEY="your-api-key"
```

`OPENPROJECT_API_KEY` is an OpenProject API key (Account settings → Access tokens in OpenProject), sent as HTTP Basic auth with username `apikey`.

## Development

```bash
npm run dev     # run the server directly via tsx, no build step
npm run build   # compile TypeScript to dist/
npm start        # run the compiled server from dist/
```

This is an MCP server: it communicates over stdio, so it's meant to be launched by an MCP client (Claude Code, Claude Desktop, MCP Inspector), not run standalone in a terminal.

To register it in Claude Code, point the client at `npm run dev` (or `node dist/index.js` after building) with the working directory set to this project.

## Tools

Read-only, v0.1 scope:

| Tool | Description |
| --- | --- |
| `get_current_user` | The OpenProject user associated with the configured API key |
| `list_projects` | Projects visible to the configured API key |
| `get_work_package(id)` | A single work package, returned as a compact summary |
| `list_my_open_work_packages(pageSize?)` | Open work packages assigned to the current API user |
| `search_work_packages(query, projectId?, openOnly?, limit?)` | Work packages matching a subject search |
| `get_work_package_context(id)` | A work package together with its project, relations, and attachments |

See `openproject_mcp_implementation_plan.md` for the full roadmap (metadata tools, write operations, composite developer tools).

## Architecture

```
src/
├── config.ts              # env validation (OPENPROJECT_URL, OPENPROJECT_API_KEY)
├── openproject/
│   ├── client.ts           # openProjectRequest() — auth, fetch, error normalization
│   ├── errors.ts            # OpenProjectApiError
│   ├── types.ts              # OpenProject API response shapes
│   └── transformers.ts       # HAL responses → compact summaries
├── tools/
│   ├── helpers.ts            # runTool() — turns thrown errors into MCP isError results
│   ├── users.ts
│   ├── projects.ts
│   └── work-packages.ts
└── index.ts                # bootstrap: create McpServer, register tools, connect stdio
```

Logging goes to `stderr` only — stdout is reserved for MCP protocol traffic.
