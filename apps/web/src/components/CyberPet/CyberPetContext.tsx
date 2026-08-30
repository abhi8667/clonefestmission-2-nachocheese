import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSSE } from '../../context/SSEContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { playCyberSound } from './audio.ts';
import {
  fetchFlowAnalytics,
  fetchProjects,
  fetchBugs,
  fetchBugDetail,
  fetchInbox,
  fetchUsers,
  checkDuplicates,
  simulateProjectCommit
} from '../../services/api.ts';
import { Bug } from '@triarc/shared-types';

export type PetMood = 'idle' | 'scanning' | 'alert' | 'celebrate' | 'thinking';
export type PetSkin = 'lizard' | 'drone' | 'fox' | 'crt';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actionType?: 'duplicate_radar' | 'bottleneck_analysis' | 'incident_brief' | 'commit_sim' | 'clearance_audit';
  payload?: any;
}

interface CyberPetContextType {
  mood: PetMood;
  setMood: (mood: PetMood) => void;
  skin: PetSkin;
  setSkin: (skin: PetSkin) => void;
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  currentThought: string | null;
  setThought: (thought: string | null, durationMs?: number) => void;
  chatMessages: ChatMessage[];
  sendUserMessage: (text: string) => Promise<void>;
  runAssistantAction: (actionType: ChatMessage['actionType'], extraArg?: string) => Promise<void>;
  clearChat: () => void;
}

const CyberPetContext = createContext<CyberPetContextType | undefined>(undefined);

export const CyberPetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lastEvent } = useSSE();
  const { currentUser } = useAuth();

  const [mood, setMoodState] = useState<PetMood>('idle');
  const [skin, setSkin] = useState<PetSkin>('lizard');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentThought, setCurrentThought] = useState<string | null>(
    'TOM THE LIZARD ONLINE 🦎 // CLICK ME TO LAUNCH AI TRIAGE COPILOT'
  );

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `🦎 *Flick!* Hello Operator ${currentUser?.name ? currentUser.name.toUpperCase() : 'ALEX'}! I am **TOM**, your Cyber Lizard AI Copilot & Triage Sentinel.

I hunt down bugs in the telemetry matrix, monitor review queues for SLA breaches, compute vector embeddings for duplicate detection, and keep defect pipelines moving fast.

**Quick commands you can try:**
- *"Check duplicates for #412"* or *"Run duplicate radar"*
- *"Show stalled reviews"* or *"Flow analysis"*
- *"Show blockers"* or *"Show critical issues"*
- *"Workspace health brief"*
- *"RBAC clearance audit"*
- *"Simulate commit"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Every timer is tracked so nothing fires into an unmounted tree.
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const track = useCallback((id: ReturnType<typeof setTimeout>) => {
    timers.current.add(id);
    return id;
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const setMood = useCallback((newMood: PetMood) => {
    setMoodState(newMood);
  }, []);

  const setThought = useCallback((thought: string | null, durationMs: number = 6000) => {
    setCurrentThought(thought);
    if (thought && durationMs > 0) {
      track(setTimeout(() => {
        setCurrentThought((prev) => (prev === thought ? null : prev));
      }, durationMs));
    }
  }, [track]);

  // React to Live SSE Events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'git:commit') {
      const commit = lastEvent.data?.commit;
      setMood('celebrate');
      if (soundEnabled) playCyberSound('celebrate');
      setThought(`⚡ NEW COMMIT: ${commit?.short_sha || 'HEAD'} pushed to branch ${commit?.branch || 'main'}!`);
      track(setTimeout(() => setMood('idle'), 4000));
    } else if (lastEvent.type === 'bug:updated') {
      setMood('scanning');
      if (soundEnabled) playCyberSound('chirp');
      setThought(`📊 Issue #${lastEvent.data?.bug_id || ''} updated: status transition synchronized.`);
      track(setTimeout(() => setMood('idle'), 3000));
    } else if (lastEvent.type === 'notification:created') {
      setMood('alert');
      if (soundEnabled) playCyberSound('alert');
      setThought(`🔔 INCOMING OPERATOR REQUEST: Review flag dispatched to your inbox.`);
      track(setTimeout(() => setMood('idle'), 4000));
    }
  }, [lastEvent, soundEnabled, setThought, setMood, track]);

  // Periodic helpful contextual thoughts
  useEffect(() => {
    const thoughts = [
      '⚡ TIP: Press Ctrl+K anytime to open the global Command Palette.',
      '🎯 DUPLICATE RADAR: Cosine embedding comparisons active on all bug filings.',
      '📡 FLOW WATCHDOG: Review queues monitored for 24h SLA compliance.',
      '🛡️ RBAC ENFORCER: Confidential security groups isolated with cryptographic tokens.',
      '🦎 TOM TIP: Click on me to open the AI Copilot diagnostic drawer!'
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (!isAssistantOpen && !currentThought) {
        setThought(thoughts[idx % thoughts.length], 5000);
        idx++;
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [isAssistantOpen, currentThought, setThought]);

  const sendUserMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setMood('thinking');
    if (soundEnabled) playCyberSound('thinking');

    const lower = text.toLowerCase();
    const uid = currentUser?.id;

    // Check for specific bug ID mention (e.g. "#412", "bug 412", "CORE-412")
    const bugIdMatch = text.match(/(?:#|bug\s*#?|issue\s*#?|core-|pay-|sec-)(\d+)/i);
    const specificBugId = bugIdMatch ? parseInt(bugIdMatch[1], 10) : null;

    // 1. Greetings & Identity
    if (/^(hi|hello|hey|greetings|howdy|yo)(\s+tom|\s+bot|\s+copilot)?$/i.test(lower.trim()) ||
        /who are you|what are you|what is your name|introduce yourself/i.test(lower)) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: `🦎 **Hello ${currentUser?.name || 'Operator'}!** I am **Tom**, your autonomous Cyber Lizard AI Copilot.

I can assist you with:
- 🎯 **Duplicate Radar**: *"Check duplicates for #412"*
- ⏱️ **Flow Bottlenecks**: *"Show stalled reviews"* or *"SLA compliance"*
- 🪲 **Bug Queries**: *"Show blockers"*, *"Show open bugs"*, or *"Bug #412 details"*
- 📊 **Workspace Brief**: *"Workspace status report"*
- 🛡️ **Security Audit**: *"RBAC clearance audit"*
- ⚡ **Git Telemetry**: *"Simulate a commit"*

What would you like to inspect?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setMood('idle');
      if (soundEnabled) playCyberSound('chirp');
      return;
    }

    // 2. Help / Capabilities
    if (/^help|what can you do|commands|capabilities|options/i.test(lower.trim())) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: `⚡ **Tom AI Copilot Commands & Diagnostics Guide:**

1. **Duplicate Radar**: Compares issue title & description against 384-dimensional vector embeddings with cosine similarity.
   - *"Run duplicate radar"* (analyzes latest issue)
   - *"Check duplicates for bug 412"* (analyzes specific bug)

2. **Flow & SLA Bottlenecks**: Identifies stalled review flags (>24h), quiet branches (>3d), and stage cycle times.
   - *"Show stalled bugs"* or *"Bottleneck analysis"*

3. **Bug & Incident Queries**: Live filter over all tracked issues.
   - *"Show blockers"* or *"Critical bugs"*
   - *"Show unconfirmed issues"*
   - *"Details for bug #412"*

4. **Executive Workspace Brief**: Full summary of open issues, projects, and incoming review requests.
   - *"Workspace brief"*

5. **RBAC & Group Audit**: Inspects user clearances and confidential security group protections.
   - *"RBAC audit"*

6. **Git Telemetry Simulation**: Simulates webhook pushes with automated workflow progression.
   - *"Simulate commit"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setMood('idle');
      if (soundEnabled) playCyberSound('chirp');
      return;
    }

    // 3. Workflow & Flags explanation
    if (/how (do|does) (workflow|flag|transition|review|sla|triarc) work|explain (workflow|flags|transitions)/i.test(lower)) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          text: `📋 **Triarc Workflow & Flags Architecture:**

• **Core Defect Lifecycle:**
  Unconfirmed ➔ Confirmed ➔ In Progress ➔ In Review ➔ Resolved ➔ Verified ➔ Closed

• **Automated Webhook Triggers:**
  - Pushing a commit with 'Fixes #<id>' auto-advances the bug to **Resolved**.
  - Opening a Pull Request auto-moves the bug to **In Review**.
  - Merging a PR auto-resolves linked issues and satisfies open 'review?+' flags.

• **Request Flags System:**
  - 'review?': Assigned to an operator for code/PR signoff. Flashing red warning if stalled >24h!
  - 'needinfo?': Information requested from reporter/triage lead.
  - 'security?': Confidential isolation; restricted to authorized security group holders.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setMood('idle');
      if (soundEnabled) playCyberSound('chirp');
      return;
    }

    // 4. Specific bug detail lookup
    if (specificBugId && /detail|show|info|status|what is bug|tell me about/i.test(lower) && !/duplicat|radar|similar|dupe/i.test(lower)) {
      try {
        const res = await fetchBugDetail(specificBugId, uid);
        const bug = res?.bug;
        if (!bug) {
          throw new Error(`Bug #${specificBugId} not found or restricted by security clearance.`);
        }
        const assignedName = bug.assignee?.name ? `@${bug.assignee.name}` : (bug.assignee_id ? `@${bug.assignee_id}` : 'Unassigned');
        const flagsStr = (bug.flags && bug.flags.length > 0)
          ? bug.flags.map((f: any) => `${f.name}${f.status} (${f.requestee_name || f.requestee_id || 'team'})`).join(', ')
          : 'None';

        const descSnippet = bug.description ? `
> ${bug.description.slice(0, 150)}${bug.description.length > 150 ? '...' : ''}` : '';
        const responseText = `**Bug #${bug.id}: ${bug.title}**
• **Project**: ${bug.project_key || 'CORE'} · **Component**: ${bug.component_id}
• **Status**: ${bug.status} · **Severity**: ${bug.severity} · **Priority**: ${bug.priority}
• **Assignee**: ${assignedName} · **Reporter**: @${bug.reporter?.name || bug.reporter_id}
• **Active Flags**: ${flagsStr}${descSnippet}`;

        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setMood('idle');
        if (soundEnabled) playCyberSound('chirp');
        return;
      } catch (err: any) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ Could not fetch details for #${specificBugId}: ${err.message || 'Access restricted or invalid ID.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setMood('alert');
        if (soundEnabled) playCyberSound('alert');
        return;
      }
    }

    // 5. Bug querying (Blockers, criticals, unconfirmed, etc.)
    if (/blocker|critical|highest|show bugs|open bugs|list bugs|unconfirmed|in progress/i.test(lower) && !/bottleneck|flow|stalled/i.test(lower)) {
      try {
        const { bugs } = await fetchBugs({ userId: uid });
        let filtered = bugs || [];

        let categoryLabel = 'Open Issues';
        if (/blocker/i.test(lower)) {
          filtered = filtered.filter((b) => b.severity === 'blocker' || b.priority === 'highest');
          categoryLabel = 'Blocker Issues';
        } else if (/critical/i.test(lower)) {
          filtered = filtered.filter((b) => b.severity === 'critical' || b.severity === 'blocker');
          categoryLabel = 'Critical & Blocker Issues';
        } else if (/unconfirmed/i.test(lower)) {
          filtered = filtered.filter((b) => b.status === 'Unconfirmed');
          categoryLabel = 'Unconfirmed Triage Queue';
        } else if (/in progress/i.test(lower)) {
          filtered = filtered.filter((b) => b.status === 'In Progress');
          categoryLabel = 'In Progress Issues';
        }

        const topBugs = filtered.slice(0, 6);
        if (topBugs.length === 0) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: `ai_${Date.now()}`,
              sender: 'assistant',
              text: `✅ **${categoryLabel}**: Zero matching bugs currently found in the active workspace.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          const bugLines = topBugs
            .map((b) => `- **#${b.id}** [${b.status}] ${b.title} (${b.severity}/${b.priority})`)
            .join('\n');
          const moreText = filtered.length > 6 ? `\n\n*...and ${filtered.length - 6} more in the issue table.*` : '';

          setChatMessages((prev) => [
            ...prev,
            {
              id: `ai_${Date.now()}`,
              sender: 'assistant',
              text: `🪲 **${categoryLabel} (${filtered.length} total):**\n${bugLines}${moreText}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
        setMood('idle');
        if (soundEnabled) playCyberSound('chirp');
        return;
      } catch (err: any) {
        // Fallback
      }
    }

    // 6. Action routing
    let actionType: ChatMessage['actionType'] = undefined;
    if (/duplicat|radar|similar|dupe/.test(lower)) actionType = 'duplicate_radar';
    else if (/bottleneck|stalled|flow|sla|latency|cycle|slow|velocit/.test(lower)) actionType = 'bottleneck_analysis';
    else if (/commit|git|push|simulate/.test(lower)) actionType = 'commit_sim';
    else if (/security|clearance|rbac|group|role|permission|who/.test(lower)) actionType = 'clearance_audit';
    else if (/summary|brief|report|overview|status|how many|count|health/.test(lower)) actionType = 'incident_brief';

    if (actionType) {
      await runAssistantAction(actionType, specificBugId ? String(specificBugId) : undefined);
      return;
    }

    // Intelligent helpful default fallback
    setChatMessages((prev) => [
      ...prev,
      {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: `🦎 I am analyzing your workspace telemetry for *"${text}"*.

Here are live diagnostics I can run directly:
- **Duplicate Radar**: *"Check duplicates for #412"*
- **Flow & SLA**: *"Show stalled reviews & bottlenecks"*
- **Issues Filter**: *"Show blockers"* or *"Show open bugs"*
- **Executive Brief**: *"Workspace health overview"*
- **RBAC Audit**: *"Who has security clearances?"*
- **Git Push**: *"Simulate collaborator commit"*

Click any diagnostic chip above or ask me about any of the items above!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMood('idle');
    if (soundEnabled) playCyberSound('chirp');
  };

  /**
   * Every action below reads live endpoints.
   */
  const runAssistantAction = async (actionType: ChatMessage['actionType'], extraArg?: string) => {
    if (!actionType) return;
    setMood('thinking');
    if (soundEnabled) playCyberSound('thinking');

    const uid = currentUser?.id;
    let responseText = '';

    try {
      if (actionType === 'duplicate_radar') {
        let target: Bug | undefined;

        if (extraArg) {
          const numId = parseInt(extraArg, 10);
          if (!isNaN(numId)) {
            const targetRes = await fetchBugDetail(numId, uid);
            target = targetRes?.bug;
          }
        }

        if (!target) {
          const { bugs } = await fetchBugs({ userId: uid });
          target = bugs?.[0];
        }

        if (!target) {
          responseText = 'No issues are indexed yet, so there is nothing for the radar to compare.';
        } else {
          const matches = await checkDuplicates(target.title, target.description, target.id, uid);
          if (matches.length === 0) {
            responseText = `**🎯 Duplicate Radar — No Matches**
Scored **#${target.id}** *"${target.title}"* against the 384-dimensional embedding index.
No other open bug scored above the 0.40 similarity threshold.`;
          } else {
            const lines = matches
              .map((m) => `- **#${m.bug_id}** ${m.title} — **${Math.round(m.similarity_score * 100)}% match**`)
              .join('\n');
            responseText = `**🎯 Duplicate Radar — Matches for #${target.id} ("${target.title}")**
${lines}

*Scores are cosine similarity over the live 384-dim index, strictly filtered by your security clearance.*`;
          }
        }
      } else if (actionType === 'bottleneck_analysis') {
        const flow = await fetchFlowAnalytics(30, uid);
        const a = flow?.summary?.averages || {};
        const s2 = flow?.summary || {};
        const worst = (flow?.stalled_bugs || [])[0];
        const worstStr = worst ? `

⚠️ **Longest Stall**: **#${worst.bug_id}** *${worst.title}* (Stalled in ${worst.stage} for ${Math.round(worst.hours_in_stage)}h)` : '';
        responseText =
          `**⏱️ Flow Bottleneck & SLA Watchdog (Last 30 Days)**
` +
          `- **Stage Latencies**: Triage: **${Math.round(a.triage_hours ?? 0)}h** · Dev: **${Math.round(a.dev_hours ?? 0)}h** · Review: **${Math.round(a.review_hours ?? 0)}h** · Verify: **${Math.round(a.verify_hours ?? 0)}h**
` +
          `- **Stalled Reviews (>24h)**: **${s2.stalled_count ?? 0}** issues currently bottlenecked
` +
          `- **Sleeper Branches (>3d quiet)**: **${s2.sleeper_count ?? 0}** branches
` +
          `- **SLA Compliance**: **${s2.sla_compliance_percent ?? 0}%** (${s2.sla_breached_count ?? 0} breached)
` +
          `- **Throughput**: **${s2.throughput_per_week ?? 0} bugs/week** · Reopen Rate: **${s2.reopen_rate_percent ?? 0}%**` +
          worstStr;
      } else if (actionType === 'incident_brief') {
        const [flow, projects, inbox] = await Promise.all([
          fetchFlowAnalytics(30, uid),
          fetchProjects(uid),
          fetchInbox(uid)
        ]);
        const s2 = flow?.summary || {};
        const projectLines = projects
          .map((p: any) => `- **${p.key}** (${p.name}) — ${p.open_bugs_count ?? 0} open issues`)
          .join('\n');
        responseText =
          `**📊 Workspace Health Brief**
` +
          `- **Total Issues Tracked**: **${s2.total_bugs ?? 0}** across **${projects.length}** workspaces
` +
          `- **SLA Compliance**: **${s2.sla_compliance_percent ?? 0}%** (${s2.stalled_count ?? 0} currently stalled)
` +
          `- **Your Inbox**: **${inbox?.incoming?.length ?? 0}** incoming flags, **${inbox?.outgoing?.length ?? 0}** outgoing requests

` +
          `**Workspaces:**
` +
          projectLines;
      } else if (actionType === 'clearance_audit') {
        const users = await fetchUsers();
        const internal = users.filter((u: any) => !u.is_external);
        const byRole = internal.reduce((acc: Record<string, string[]>, u: any) => {
          (acc[u.role] ||= []).push(`@${u.username}`);
          return acc;
        }, {});
        const lines = Object.entries(byRole)
          .map(([role, names]) => `- **${role.toUpperCase()}**: ${(names as string[]).join(', ')}`)
          .join('\n');
        const grouped = internal.filter((u: any) => (u.security_group_ids || []).length > 0);
        responseText =
          `**🛡️ RBAC & Clearance Audit (${internal.length} Internal Operators)**
${lines}\n\n` +
          `🔒 **${grouped.length}** operators hold verified security-group memberships. Confidential security defects remain strictly shielded from unauthorized viewing, search indices, and duplicate radar.`;
      } else if (actionType === 'commit_sim') {
        const projects = await fetchProjects(uid);
        const target = projects[0];
        if (!target) {
          responseText = 'No workspace is available to push a commit against.';
        } else {
          const res = await simulateProjectCommit(
            target.key,
            {
              author: currentUser?.username || 'alex',
              message: 'chore: telemetry heartbeat probe from Tom AI',
              branch: 'main'
            },
            uid
          );
          const sha = res?.commit?.short_sha || res?.event?.commit_hash || 'HEAD';
          responseText = `⚡ **Telemetry Commit Broadcast to ${target.key}**
Commit \`${sha}\` broadcasted across the real-time SSE stream.
The defect flow matrix and any active browser tabs synchronized automatically.`;
        }
      }
    } catch (err: any) {
      responseText = `I could not complete that: ${err?.message || 'the API did not respond'}. Nothing was changed.`;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `ai_action_${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    setMood('celebrate');
    if (soundEnabled) playCyberSound('celebrate');
    track(setTimeout(() => setMood('idle'), 3000));
  };

  const clearChat = () => {
    setChatMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: '🦎 Terminal session reset. Tom AI is ready for new triage diagnostics or telemetry instructions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <CyberPetContext.Provider
      value={{
        mood,
        setMood,
        skin,
        setSkin,
        isAssistantOpen,
        setIsAssistantOpen,
        soundEnabled,
        setSoundEnabled,
        currentThought,
        setThought,
        chatMessages,
        sendUserMessage,
        runAssistantAction,
        clearChat
      }}
    >
      {children}
    </CyberPetContext.Provider>
  );
};

export const useCyberPet = () => {
  const context = useContext(CyberPetContext);
  if (!context) {
    throw new Error('useCyberPet must be used within a CyberPetProvider');
  }
  return context;
};
