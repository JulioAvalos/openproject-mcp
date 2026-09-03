import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
    buildFiltersQuery,
    buildQueryString,
    openProjectRequest,
} from "../openproject/client.js";
import { OpenProjectApiError } from "../openproject/errors.js";
import {
    toCommentSummary,
    toProjectSummary,
    toWorkPackageSummary,
} from "../openproject/transformers.js";
import type {
    OpenProjectActivity,
    OpenProjectCollection,
    OpenProjectProject,
    OpenProjectWorkPackage,
} from "../openproject/types.js";
import { runTool } from "./helpers.js";

async function fetchWorkPackage(id: number): Promise<OpenProjectWorkPackage> {
    try {
        return await openProjectRequest<OpenProjectWorkPackage>(
            `/api/v3/work_packages/${id}`
        );
    } catch (error) {
        if (error instanceof OpenProjectApiError && error.status === 404) {
            throw new OpenProjectApiError(
                404,
                error.path,
                `Work package ${id} was not found`
            );
        }
        throw error;
    }
}

async function fetchActivities(
    id: number
): Promise<OpenProjectCollection<OpenProjectActivity>> {
    return openProjectRequest<OpenProjectCollection<OpenProjectActivity>>(
        `/api/v3/work_packages/${id}/activities`
    );
}

async function fetchWorkPackageCollection(
    filters: Record<string, { operator: string; values: string[] }>[],
    pageSize: number
): Promise<OpenProjectCollection<OpenProjectWorkPackage>> {
    const query = `${buildFiltersQuery(filters)}&${buildQueryString({
        pageSize,
    }).slice(1)}`;

    return openProjectRequest<OpenProjectCollection<OpenProjectWorkPackage>>(
        `/api/v3/work_packages?${query}`
    );
}

export function registerWorkPackageTools(server: McpServer) {
    server.registerTool(
        "get_work_package",
        {
            description: "Get an OpenProject work package by ID",
            inputSchema: z.object({
                id: z.number().int().positive(),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ id }) =>
            runTool(async () => toWorkPackageSummary(await fetchWorkPackage(id)))
    );

    server.registerTool(
        "list_my_open_work_packages",
        {
            description: "List open work packages assigned to the current API user",
            inputSchema: z.object({
                pageSize: z.number().int().min(1).max(100).default(20),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ pageSize }) =>
            runTool(async () => {
                const result = await fetchWorkPackageCollection(
                    [
                        { status: { operator: "o", values: [] } },
                        { assignee: { operator: "=", values: ["me"] } },
                    ],
                    pageSize
                );
                return {
                    count: result.count,
                    total: result.total,
                    items: result._embedded.elements.map(toWorkPackageSummary),
                };
            })
    );

    server.registerTool(
        "search_work_packages",
        {
            description: "Search work packages by subject text, optionally scoped to a project",
            inputSchema: z.object({
                query: z.string().min(1),
                projectId: z.number().int().positive().optional(),
                openOnly: z.boolean().default(false),
                limit: z.number().int().min(1).max(100).default(20),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ query, projectId, openOnly, limit }) =>
            runTool(async () => {
                const filters: Record<
                    string,
                    { operator: string; values: string[] }
                >[] = [{ subject: { operator: "~", values: [query] } }];

                if (projectId) {
                    filters.push({
                        project: { operator: "=", values: [String(projectId)] },
                    });
                }

                if (openOnly) {
                    filters.push({ status: { operator: "o", values: [] } });
                }

                const result = await fetchWorkPackageCollection(filters, limit);
                return result._embedded.elements.map(toWorkPackageSummary);
            })
    );

    server.registerTool(
        "get_work_package_context",
        {
            description:
                "Get a work package together with its project, relations, and attachments in one call",
            inputSchema: z.object({
                id: z.number().int().positive(),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ id }) =>
            runTool(async () => {
                const workPackage = await fetchWorkPackage(id);

                const projectHref = workPackage._links?.project?.href;
                const projectId = projectHref?.split("/").pop();

                const [project, relations, attachments] = await Promise.all([
                    projectId
                        ? openProjectRequest<OpenProjectProject>(
                              `/api/v3/projects/${projectId}`
                          ).catch(() => null)
                        : Promise.resolve(null),
                    openProjectRequest<
                        OpenProjectCollection<{
                            id: number;
                            type: string;
                            _links: {
                                to?: { href?: string; title?: string };
                            };
                        }>
                    >(`/api/v3/work_packages/${id}/relations`).catch(
                        () => ({ total: 0, count: 0, _embedded: { elements: [] } })
                    ),
                    openProjectRequest<
                        OpenProjectCollection<{
                            id: number;
                            fileName: string;
                            contentType: string;
                        }>
                    >(`/api/v3/work_packages/${id}/attachments`).catch(
                        () => ({ total: 0, count: 0, _embedded: { elements: [] } })
                    ),
                ]);

                return {
                    workPackage: toWorkPackageSummary(workPackage),
                    project: project ? toProjectSummary(project) : null,
                    relations: relations._embedded.elements.map((relation) => ({
                        id: relation.id,
                        type: relation.type,
                        workPackage: relation._links.to?.title,
                    })),
                    attachments: attachments._embedded.elements.map(
                        (attachment) => ({
                            id: attachment.id,
                            fileName: attachment.fileName,
                            contentType: attachment.contentType,
                        })
                    ),
                };
            })
    );

    server.registerTool(
        "list_work_package_comments",
        {
            description:
                "List comments (activity notes) on an OpenProject work package, most recent first",
            inputSchema: z.object({
                id: z.number().int().positive(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
            annotations: { readOnlyHint: true },
        },
        async ({ id, limit }) =>
            runTool(async () => {
                await fetchWorkPackage(id);
                const activities = await fetchActivities(id);
                const comments = activities._embedded.elements.filter(
                    (activity) =>
                        activity._type === "Activity::Comment" &&
                        !!activity.comment?.raw
                );
                const items = comments.slice(-limit).reverse().map(toCommentSummary);
                return {
                    total: comments.length,
                    items,
                };
            })
    );

    server.registerTool(
        "add_work_package_comment",
        {
            description:
                "Add a comment (Markdown supported) to an OpenProject work package. Posted as the API-key user and visible to everyone with access to the work package.",
            inputSchema: z.object({
                id: z.number().int().positive(),
                comment: z.string().min(1),
            }),
            annotations: { readOnlyHint: false },
        },
        async ({ id, comment }) =>
            runTool(async () => {
                try {
                    const activity = await openProjectRequest<OpenProjectActivity>(
                        `/api/v3/work_packages/${id}/activities`,
                        {
                            method: "POST",
                            body: JSON.stringify({ comment: { raw: comment } }),
                        }
                    );
                    return toCommentSummary(activity);
                } catch (error) {
                    if (error instanceof OpenProjectApiError) {
                        if (error.status === 404) {
                            throw new OpenProjectApiError(
                                404,
                                error.path,
                                `Work package ${id} was not found`
                            );
                        }
                        if (error.status === 403) {
                            throw new OpenProjectApiError(
                                403,
                                error.path,
                                `Not permitted to comment on work package ${id}`
                            );
                        }
                    }
                    throw error;
                }
            })
    );

    server.registerTool(
        "update_work_package_comment",
        {
            description:
                "Edit an existing comment on an OpenProject work package (Markdown supported). Identified by the comment/activity ID returned from add_work_package_comment or list_work_package_comments. OpenProject only allows editing a comment for a limited time after it was posted.",
            inputSchema: z.object({
                activityId: z.number().int().positive(),
                comment: z.string().min(1),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        },
        async ({ activityId, comment }) =>
            runTool(async () => {
                try {
                    const activity = await openProjectRequest<OpenProjectActivity>(
                        `/api/v3/activities/${activityId}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify({ comment }),
                        }
                    );
                    return toCommentSummary(activity);
                } catch (error) {
                    if (error instanceof OpenProjectApiError) {
                        if (error.status === 404) {
                            throw new OpenProjectApiError(
                                404,
                                error.path,
                                `Comment ${activityId} was not found`
                            );
                        }
                        if (error.status === 400 || error.status === 422) {
                            throw new OpenProjectApiError(
                                error.status,
                                error.path,
                                `Comment ${activityId} can no longer be edited (OpenProject only allows editing shortly after posting)`
                            );
                        }
                        if (error.status === 403) {
                            throw new OpenProjectApiError(
                                403,
                                error.path,
                                `Not permitted to edit comment ${activityId}`
                            );
                        }
                    }
                    throw error;
                }
            })
    );
}
