import { config } from "../config.js";
import { OpenProjectApiError } from "./errors.js";

const authHeader = `Basic ${Buffer.from(
    `apikey:${config.openProjectApiKey}`
).toString("base64")}`;

export async function openProjectRequest<T>(
    path: string,
    init?: RequestInit
): Promise<T> {
    console.error(`[openproject] ${init?.method ?? "GET"} ${path}`);

    let response: Response;
    try {
        response = await fetch(`${config.openProjectUrl}${path}`, {
            ...init,
            headers: {
                Authorization: authHeader,
                Accept: "application/hal+json",
                ...(init?.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...init?.headers,
            },
        });
    } catch (error) {
        throw new OpenProjectApiError(
            0,
            path,
            `Could not reach OpenProject: ${(error as Error).message}`
        );
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new OpenProjectApiError(
            response.status,
            path,
            `OpenProject request failed (${response.status} ${response.statusText}): ${body}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/** Builds an OpenProject `filters` query param from a list of filter objects. */
export function buildFiltersQuery(
    filters: Record<string, { operator: string; values: string[] }>[]
): string {
    return `filters=${encodeURIComponent(JSON.stringify(filters))}`;
}

export function buildQueryString(
    params: Record<string, string | number | boolean | undefined>
): string {
    const query = Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(
            ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join("&");

    return query ? `?${query}` : "";
}
