# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Model Context Protocol (MCP) server that exposes OpenProject API operations as MCP tools, communicating over stdio.

## Commands

- `npm run dev` — run the server directly via `tsx` (no build step)
- `npm run build` — compile TypeScript to `dist/` via `tsc`
- `npm start` — run the compiled server from `dist/index.js`

There is no test suite and no linter configured.

## Configuration

The server requires two environment variables, read at startup and validated with hard failures if missing:

- `OPENPROJECT_URL` — base URL of the OpenProject instance
- `OPENPROJECT_API_KEY` — OpenProject API key, sent as HTTP Basic auth with username `apikey`

These are set in `.env` locally (not committed structure-wise, but present in this working copy).

## Architecture

- Built on `@modelcontextprotocol/server`, using `McpServer` + `serveStdio` — this process is meant to be spawned by an MCP client (e.g. Claude Desktop/Code) over stdio, not run as a standalone network service. `src/index.ts` just wires the server together and calls `serveStdio`.
- `src/config.ts` reads and validates `OPENPROJECT_URL` / `OPENPROJECT_API_KEY` at startup, failing hard if either is missing.
- `src/openproject/client.ts` holds `openProjectRequest(path, init?)`, the single shared HTTP helper: it builds the Basic-auth header from `OPENPROJECT_API_KEY`, hits `${OPENPROJECT_URL}${path}` with `Accept: application/hal+json` (OpenProject's API format), sets `Content-Type: application/json` automatically when `init.body` is present (so it serves writes/POSTs as well as GETs), throws an `OpenProjectApiError` on non-OK responses, and returns parsed JSON. It also exports `buildFiltersQuery`/`buildQueryString` helpers for constructing OpenProject filter/query params.
- `src/openproject/errors.ts` defines `OpenProjectApiError` (status + path + message). `src/openproject/types.ts` holds the raw HAL API shapes (`OpenProjectWorkPackage`, `OpenProjectProject`, `OpenProjectUser`, `OpenProjectActivity`, `OpenProjectCollection<T>`, etc.) plus the trimmed-down summary shapes returned to callers (`WorkPackageSummary`, `CommentSummary`, ...). `src/openproject/transformers.ts` maps the former to the latter (`toWorkPackageSummary`, `toProjectSummary`, `toUserSummary`, `toCommentSummary`).
- `src/tools/helpers.ts` provides `runTool(fn)`, which wraps a tool handler: on success it JSON-stringifies the result into an MCP `content` block, and on failure it turns an `OpenProjectApiError` (or any other error) into an `isError` result instead of crashing the process.
- Tools are registered via `server.registerTool(name, { description, inputSchema }, handler)` in `src/tools/{projects,users,work-packages}.ts`, with `inputSchema` defined using `zod`. Each handler calls `openProjectRequest` (directly or via a small per-file fetch helper) and returns `runTool(...)` — this is the pattern to follow for adding new tools.
- `src/tools/work-packages.ts` is the largest module: `get_work_package`, `list_my_open_work_packages`, `search_work_packages`, `get_work_package_context`, plus comment support — `list_work_package_comments`, `add_work_package_comment`, and `update_work_package_comment`. Listing/adding are built on OpenProject's activity-stream endpoints (`GET`/`POST /api/v3/work_packages/{id}/activities`; comments are activities with `_type: "Activity::Comment"`, posted as `{ comment: { raw } }`). Editing goes through `PATCH /api/v3/activities/{activityId}` directly — note the body shape differs from POST: it's `{ comment: "<raw text>" }` (a plain string, not `{ raw }`) — and OpenProject only allows it for a short window after the comment was created (a 400/422 past that window is mapped to a friendly "can no longer be edited" message).
- Module system is ESM (`"type": "module"` in package.json) with `NodeNext` module resolution — relative imports within `src/` must use explicit file extensions.
