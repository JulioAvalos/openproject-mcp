import "dotenv/config";

const OPENPROJECT_URL = process.env.OPENPROJECT_URL;
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY;

if (!OPENPROJECT_URL) {
    throw new Error("OPENPROJECT_URL is required");
}

if (!OPENPROJECT_API_KEY) {
    throw new Error("OPENPROJECT_API_KEY is required");
}

export const config = {
    openProjectUrl: OPENPROJECT_URL.replace(/\/+$/, ""),
    openProjectApiKey: OPENPROJECT_API_KEY,
};
