export const defaultWorkflowConfig = {
    projectId: "default",
    states: [
        "Unconfirmed",
        "Confirmed",
        "In Progress",
        "In Review",
        "Resolved",
        "Verified",
        "Closed",
        "Duplicate",
        "WontFix"
    ],
    initial: "Unconfirmed",
    transitions: [
        { "from": "Unconfirmed", "to": "Confirmed", "roles": ["triager", "admin"] },
        { "from": "Confirmed", "to": "In Progress", "roles": ["developer", "admin"] },
        { "from": "In Progress", "to": "In Review", "roles": ["developer", "admin"], "automatable": true },
        {
            "from": "In Review",
            "to": "Resolved",
            "roles": ["developer", "admin"],
            "automatable": true,
            "guards": { "requireComment": true, "requireFields": ["resolution"] }
        },
        {
            "from": "In Progress",
            "to": "Resolved",
            "roles": ["developer", "admin"],
            "automatable": true,
            "guards": { "requireComment": true, "requireFields": ["resolution"] }
        },
        { "from": "Resolved", "to": "Verified", "roles": ["reporter", "triager", "admin"] },
        { "from": "Verified", "to": "Closed", "roles": ["triager", "admin"] },
        {
            "from": "Resolved",
            "to": "In Progress",
            "roles": ["developer", "triager", "admin"],
            "guards": { "requireComment": true }
        },
        {
            "from": "*",
            "to": "Duplicate",
            "roles": ["triager", "admin"],
            "guards": { "requireFields": ["duplicate_of"] }
        },
        {
            "from": "*",
            "to": "WontFix",
            "roles": ["triager", "admin"],
            "guards": { "requireComment": true }
        }
    ]
};
export const workflowConfig = defaultWorkflowConfig;
export * from './workflow.js';
export * from './flags.js';
export * from './metrics.js';
export * from './query.js';
export * from './relationships.js';
//# sourceMappingURL=index.js.map