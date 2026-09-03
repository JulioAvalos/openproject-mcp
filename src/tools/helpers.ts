import { OpenProjectApiError } from "../openproject/errors.js";

/** Wraps a tool handler so thrown errors become MCP `isError` results instead of crashing the process. */
export function toolResult(data: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}

export function errorResult(message: string) {
    return {
        content: [{ type: "text" as const, text: message }],
        isError: true,
    };
}

export async function runTool<T>(fn: () => Promise<T>) {
    try {
        return toolResult(await fn());
    } catch (error) {
        if (error instanceof OpenProjectApiError) {
            return errorResult(error.message);
        }
        return errorResult(`Unexpected error: ${(error as Error).message}`);
    }
}
