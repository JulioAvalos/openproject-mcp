export interface HalLink {
    href?: string;
    title?: string;
}

export interface OpenProjectUser {
    id: number;
    name: string;
}

export interface OpenProjectProject {
    id: number;
    name: string;
    identifier: string;
}

export interface OpenProjectWorkPackage {
    id: number;
    subject: string;
    description?: { raw?: string };
    createdAt: string;
    updatedAt: string;
    _links: {
        status?: HalLink;
        priority?: HalLink;
        assignee?: HalLink;
        project?: HalLink;
        type?: HalLink;
    };
}

export interface OpenProjectCollection<T> {
    total: number;
    count: number;
    _embedded: {
        elements: T[];
    };
}

export interface WorkPackageSummary {
    id: number;
    subject: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee?: string;
    project?: string;
    type?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OpenProjectActivity {
    id: number;
    _type: string;
    comment?: { raw?: string; html?: string };
    details?: { raw?: string }[];
    createdAt: string;
    updatedAt?: string;
    _links: {
        user?: HalLink;
        workPackage?: HalLink;
    };
}

export interface CommentSummary {
    id: number;
    comment?: string;
    user?: string;
    createdAt: string;
    updatedAt?: string;
}
