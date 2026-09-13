/**
 * @typedef {Object} PaperclipCompany
 * @property {string} id
 * @property {string} name
 * @property {string} status
 * @property {number} budgetMonthlyCents
 * @property {string} [logoUrl]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PaperclipTeam
 * @property {string} id
 * @property {string} companyId
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} leadAgentId
 * @property {string|null} color
 * @property {Record<string, unknown>|null} [metadata]
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string[]} [projectIds]
 */

/**
 * @typedef {'backlog'|'todo'|'in_progress'|'in_review'|'blocked'|'done'|'cancelled'} PaperclipIssueStatus
 */

/**
 * @typedef {Object} PaperclipIssue
 * @property {string} id
 * @property {string} companyId
 * @property {string|null} projectId
 * @property {string|null} goalId
 * @property {string} title
 * @property {string} description
 * @property {PaperclipIssueStatus} status
 * @property {string|null} priority
 * @property {string|null} assigneeAgentId
 * @property {number} issueNumber
 * @property {string} identifier
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PaperclipAgent
 * @property {string} id
 * @property {string} companyId
 * @property {string} name
 * @property {string} role
 * @property {string} title
 * @property {'idle'|'paused'|'error'|'terminated'|'pending_approval'} status
 * @property {string|null} reportsTo
 * @property {string} adapterType
 * @property {Record<string, unknown>} adapterConfig
 * @property {Record<string, unknown>} runtimeConfig
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} lastHeartbeatAt
 */

/**
 * @typedef {Object} PaperclipProject
 * @property {string} id
 * @property {string} companyId
 * @property {string|null} goalId
 * @property {string|null} teamId
 * @property {string} name
 * @property {string} status
 * @property {string|null} leadAgentId
 * @property {string|null} targetDate
 * @property {Record<string, unknown>|null} [metadata]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} PaperclipGoal
 * @property {string} id
 * @property {string} companyId
 * @property {string} title
 * @property {string} description
 * @property {'task'|'objective'|'epic'} level
 * @property {string} status
 * @property {string|null} parentId
 * @property {string|null} ownerAgentId
 */

/**
 * @typedef {Object} PaperclipLiveEvent
 * @property {number} id
 * @property {string} companyId
 * @property {string} type
 * @property {string} createdAt
 * @property {Record<string, unknown>} payload
 */

/**
 * @callback PaperclipEventCallback
 * @param {PaperclipLiveEvent} event
 */

export {};
