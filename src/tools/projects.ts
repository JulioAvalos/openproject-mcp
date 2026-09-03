import type { McpServer } from "@modelcontextprotocol/server";
import { openProjectRequest } from "../openproject/client.js";
import { toProjectSummary } from "../openproject/transformers.js";
import type {
    OpenProjectCollection,
    OpenProjectProject,
} from "../openproject/types.js";
import { runTool } from "./helpers.js";

export function registerProjectTools(server: McpServer) {
    server.registerTool(
        "list_projects",
        {
            description: "List OpenProject projects visible to the configured API key",
            annotations: { readOnlyHint: true },
        },
        async () =>
            runTool(async () => {
                const projects = await openProjectRequest<
                    OpenProjectCollection<OpenProjectProject>
                >("/api/v3/projects");
                return projects._embedded.elements.map(toProjectSummary);
            })
    );
}
