import type {
    CommentSummary,
    OpenProjectActivity,
    OpenProjectProject,
    OpenProjectUser,
    OpenProjectWorkPackage,
    WorkPackageSummary,
} from "./types.js";

export function toWorkPackageSummary(
    workPackage: OpenProjectWorkPackage
): WorkPackageSummary {
    return {
        id: workPackage.id,
        subject: workPackage.subject,
        description: workPackage.description?.raw,
        status: workPackage._links?.status?.title,
        priority: workPackage._links?.priority?.title,
        assignee: workPackage._links?.assignee?.title,
        project: workPackage._links?.project?.title,
        type: workPackage._links?.type?.title,
        createdAt: workPackage.createdAt,
        updatedAt: workPackage.updatedAt,
    };
}

export function toProjectSummary(project: OpenProjectProject) {
    return {
        id: project.id,
        name: project.name,
        identifier: project.identifier,
    };
}

export function toUserSummary(user: OpenProjectUser) {
    return {
        id: user.id,
        name: user.name,
    };
}

export function toCommentSummary(activity: OpenProjectActivity): CommentSummary {
    return {
        id: activity.id,
        comment: activity.comment?.raw,
        user: activity._links?.user?.title,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt,
    };
}
