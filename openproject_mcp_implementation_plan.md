# OpenProject MCP - Implementation Plan

A minimal TypeScript MCP server wrapping OpenProject API v3, for use from Claude Code.

> **Principle:** read-only first. Add writes only after the client/error-handling is solid. Never expose a generic `execute_openproject_request` tool — each tool has one narrow purpose.

## Foundation (do first)

- `src/config.ts` — validate `OPENPROJECT_URL` / `OPENPROJECT_API_KEY`.
- `src/openproject/client.ts` — generic `openProjectRequest<T>(path, options?)` (auth, fetch, status check, JSON parse, normalized errors).
- Logs go to `stderr` only (stdout is reserved for MCP protocol traffic); never log the API key.
- `src/tools/*.ts` — one file per tool group, registered from `index.ts`.

## Tools

**Read — context**
- `get_current_user()` → `{ id, name }`
- `list_projects()` → `[{ id, name }]`
- `get_project(id)`
- `get_statuses()` / `get_priorities()` / `get_types()`

**Read — work packages**
- `get_work_package(id)` — return a compact summary (id, subject, description, status, priority, assignee, project, type, timestamps), not the raw HAL payload. 404 → `Work package <id> was not found`.
- `list_work_packages({ projectId?, status?, assignee?, pageSize? })` — translates to OpenProject filters internally; return `{ count, total, items }`.
- `list_my_open_work_packages()`
- `search_work_packages({ query, projectId?, openOnly?, limit? })`
- `get_work_package_relations(id)` / `get_related_work_packages(id)`
- `get_work_package_activities(id)` — concise `{ author, createdAt, comment }[]`
- `list_work_package_attachments(id)` — metadata only (`id`, `fileName`, `contentType`)
- `get_work_package_context(id, { includeActivities? })` — composite: work package + project + relations + attachments (+ activities). The main tool for "get everything before I start coding."

**Write (add after read tools are stable)**
- `add_work_package_comment(id, comment)`
- `update_work_package_status(id, statusId)` → returns `{ id, previousStatus, newStatus }`
- `search_users(query)` / `assign_work_package(id, userId)`
- Later, only if needed: `update_work_package_subject/description`, `set_work_package_priority`, `log_time`. Avoid `delete_*` entirely.

**Developer-oriented composite (stretch)**
- `get_development_ticket(id)` — ticket + acceptance criteria + recent comments + related tickets + attachments + extracted URLs (`figmaUrls`, `githubUrls`, `documentationUrls`) parsed from description/comments. Feeds a Figma MCP → Claude Code workflow.

## v0.1 scope (ship this first)

```
get_work_package
get_work_package_context
search_work_packages
list_my_open_work_packages
list_projects
get_current_user
```

## Definition of done

- MCP Inspector connects; all v0.1 tools show up and return compact, typed responses.
- Errors are normalized and readable; no credentials in logs or responses.
- Pagination handled for list tools.
- No write tools exposed yet.
