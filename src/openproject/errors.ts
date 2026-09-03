export class OpenProjectApiError extends Error {
    readonly status: number;
    readonly path: string;

    constructor(status: number, path: string, message: string) {
        super(message);
        this.name = "OpenProjectApiError";
        this.status = status;
        this.path = path;
    }
}
