export interface QueryFilter {
  statuses?: string[];
  priorities?: string[];
  severities?: string[];
  components?: string[];
  assignees?: string[];
  reporters?: string[];
  keywords?: string[];
  milestones?: string[];
  versions?: string[];
  watchers?: string[];
  isWatched?: boolean;
  changedTo?: string;
  changedBy?: string;
  changedAfter?: string;
  text?: string[];
  raw: string;
}

export function parseSearchQuery(queryStr: string): QueryFilter {
  const trimmed = queryStr.trim();
  const filter: QueryFilter = {
    raw: trimmed,
    text: []
  };

  if (!trimmed) {
    return filter;
  }

  // Regex to match key:value or key:"value with spaces"
  const regex = /(?:(\w+):(?:"([^"]+)"|(\S+)))|(?:"([^"]+)")|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    const key = match[1]?.toLowerCase();
    const value = match[2] || match[3] || match[4] || match[5];

    if (key && value) {
      switch (key) {
        case 'status':
          if (value.toLowerCase() === 'open') {
            filter.statuses = ['Unconfirmed', 'Confirmed', 'In Progress', 'In Review'];
          } else if (value.toLowerCase() === 'closed') {
            filter.statuses = ['Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix'];
          } else {
            filter.statuses = filter.statuses || [];
            filter.statuses.push(value);
          }
          break;
        case 'is':
          if (value.toLowerCase() === 'open') {
            filter.statuses = ['Unconfirmed', 'Confirmed', 'In Progress', 'In Review'];
          } else if (value.toLowerCase() === 'closed') {
            filter.statuses = ['Resolved', 'Verified', 'Closed', 'Duplicate', 'WontFix'];
          } else if (value.toLowerCase() === 'watched') {
            filter.isWatched = true;
          } else {
            filter.statuses = filter.statuses || [];
            filter.statuses.push(value);
          }
          break;
        case 'priority':
          filter.priorities = filter.priorities || [];
          filter.priorities.push(value.toLowerCase());
          break;
        case 'severity':
          filter.severities = filter.severities || [];
          filter.severities.push(value.toLowerCase());
          break;
        case 'component':
          filter.components = filter.components || [];
          filter.components.push(value);
          break;
        case 'assignee':
          filter.assignees = filter.assignees || [];
          filter.assignees.push(value);
          break;
        case 'reporter':
          filter.reporters = filter.reporters || [];
          filter.reporters.push(value);
          break;
        case 'keyword':
        case 'label':
        case 'tag':
          filter.keywords = filter.keywords || [];
          filter.keywords.push(value.toLowerCase());
          break;
        case 'milestone':
        case 'target':
          filter.milestones = filter.milestones || [];
          filter.milestones.push(value);
          break;
        case 'version':
          filter.versions = filter.versions || [];
          filter.versions.push(value);
          break;
        case 'watcher':
        case 'cc':
          filter.watchers = filter.watchers || [];
          filter.watchers.push(value);
          break;
        case 'changedto':
          filter.changedTo = value;
          break;
        case 'changedby':
          filter.changedBy = value;
          break;
        case 'changedafter':
          filter.changedAfter = value;
          break;
        default:
          filter.text?.push(`${key}:${value}`);
          break;
      }
    } else if (value) {
      filter.text?.push(value);
    }
  }

  return filter;
}
