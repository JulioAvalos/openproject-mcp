import type { McpServer } from "@modelcontextprotocol/server";
import { openProjectRequest } from "../openproject/client.js";
import { toUserSummary } from "../openproject/transformers.js";
import type { OpenProjectUser } from "../openproject/types.js";
import { runTool } from "./helpers.js";

export function registerUserTools(server: McpServer) {
    server.registerTool(
        "get_current_user",
        {
            description: "Get the OpenProject user associated with the configured API key",
            annotations: { readOnlyHint: true },
        },
        async () =>
            runTool(async () => {
                const user = await openProjectRequest<OpenProjectUser>(
                    "/api/v3/users/me"
                );
                return toUserSummary(user);
            })
    );
}
