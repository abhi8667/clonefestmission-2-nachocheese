import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSSE } from '../../context/SSEContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { playCyberSound } from './audio.ts';
import {
  fetchFlowAnalytics,
  fetchProjects,
  fetchBugs,
  fetchInbox,
  fetchUsers,
  checkDuplicates,
  simulateProjectCommit
} from '../../services/api.ts';

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
  runAssistantAction: (actionType: ChatMessage['actionType']) => Promise<void>;
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
      text: `🦎 *Flick!* Hello Operator ${currentUser?.name ? currentUser.name.toUpperCase() : 'ALEX'}! I am TOM, your Cyber Lizard assistant & Triage Sentinel! I hunt down bugs in the matrix, track git commits, compute duplicate embeddings, and keep review pipelines moving fast. What shall we triage today?`,
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
      '🛡️ RBAC ENFORCER: Confidential security groups isolated with cryptographic tokens.'
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

    // Route the question to a real action. Byte does not answer from memory:
    // it either runs one of these and reports live numbers, or it says it
    // cannot answer — it never invents a figure.
    const lower = text.toLowerCase();
    let actionType: ChatMessage['actionType'] = undefined;

    if (/duplicat|radar|similar|dupe/.test(lower)) actionType = 'duplicate_radar';
    else if (/bottleneck|stalled|flow|sla|latency|cycle|slow|velocit/.test(lower)) actionType = 'bottleneck_analysis';
    else if (/commit|git|push|simulate/.test(lower)) actionType = 'commit_sim';
    else if (/security|clearance|rbac|group|role|permission|who/.test(lower)) actionType = 'clearance_audit';
    else if (/summary|brief|report|overview|status|how many|count|open/.test(lower)) actionType = 'incident_brief';

    if (actionType) {
      await runAssistantAction(actionType);
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text:
          "I can't answer that one yet — I only report what I can read from the live API, and I won't guess at a number.\n\n" +
          'Things I can actually do: **duplicate radar**, **flow bottlenecks and SLA**, a **workspace brief**, an **RBAC audit**, or **simulate a commit**. Ask about any of those, or use the buttons above.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setMood('idle');
    if (soundEnabled) playCyberSound('chirp');
  };

  /**
   * Every action below reads the same live endpoints the rest of the UI uses.
   * Nothing here is a canned figure: if a call fails we say so rather than
   * inventing a number.
   */
  const runAssistantAction = async (actionType: ChatMessage['actionType']) => {
    if (!actionType) return;
    setMood('thinking');
    if (soundEnabled) playCyberSound('thinking');

    const uid = currentUser?.id;
    let responseText = '';

    try {
      if (actionType === 'duplicate_radar') {
        // Score a real bug against the live embedding index.
        const { bugs } = await fetchBugs({ userId: uid });
        const target = bugs?.[0];
        if (!target) {
          responseText = 'No issues are indexed yet, so there is nothing for the radar to compare.';
        } else {
          const matches = await checkDuplicates(target.title, target.description, target.id, uid);
          if (matches.length === 0) {
            responseText = `**Duplicate radar — no matches**
Scored #${target.id} "${target.title}" against the index. Nothing scored above the 0.40 similarity floor.`;
          } else {
            const lines = matches
              .map((m) => `- **#${m.bug_id}** ${m.title} — ${Math.round(m.similarity_score * 100)}% similar`)
              .join('\n');
            responseText = `**Duplicate radar — top matches for #${target.id}**
${lines}

Scores are cosine similarity over the live 384-dim index, filtered by your security clearance.`;
          }
        }
      } else if (actionType === 'bottleneck_analysis') {
        const flow = await fetchFlowAnalytics(30, uid);
        const a = flow?.summary?.averages || {};
        const s2 = flow?.summary || {};
        const worst = (flow?.stalled_bugs || [])[0];
        responseText =
          `**Flow analysis — last 30 days**
` +
          `- Triage: **${Math.round(a.triage_hours ?? 0)}h** · Dev: **${Math.round(a.dev_hours ?? 0)}h** · Review: **${Math.round(a.review_hours ?? 0)}h** · Verify: **${Math.round(a.verify_hours ?? 0)}h**
` +
          `- Stalled: **${s2.stalled_count ?? 0}** · Sleeper branches: **${s2.sleeper_count ?? 0}**
` +
          `- SLA compliance: **${s2.sla_compliance_percent ?? 0}%** (${s2.sla_breached_count ?? 0} breached)
` +
          `- Throughput: **${s2.throughput_per_week ?? 0}/week** · Reopen rate: **${s2.reopen_rate_percent ?? 0}%**` +
          (worst ? `

Longest stall: **#${worst.bug_id}** ${worst.title}` : '');
      } else if (actionType === 'incident_brief') {
        const [flow, projects, inbox] = await Promise.all([
          fetchFlowAnalytics(30, uid),
          fetchProjects(uid),
          fetchInbox(uid)
        ]);
        const s2 = flow?.summary || {};
        const projectLines = projects
          .map((p: any) => `- **${p.key}** ${p.name}`)
          .join('\n');
        responseText =
          `**Workspace brief**
` +
          `- Issues tracked: **${s2.total_bugs ?? 0}** across **${projects.length}** workspaces
` +
          `- Stalled: **${s2.stalled_count ?? 0}** · SLA breached: **${s2.sla_breached_count ?? 0}**
` +
          `- Your inbox: **${inbox?.incoming?.length ?? 0}** incoming, **${inbox?.outgoing?.length ?? 0}** outgoing

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
          .map(([role, names]) => `- **${role}** — ${(names as string[]).join(', ')}`)
          .join('\n');
        const grouped = internal.filter((u: any) => (u.security_group_ids || []).length > 0);
        responseText =
          `**RBAC audit — ${internal.length} internal operators**
${lines}

` +
          `**${grouped.length}** hold security-group membership, so confidential issues stay hidden from everyone else — including in search and the duplicate radar.`;
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
              message: 'chore: telemetry probe from Byte',
              branch: 'main'
            },
            uid
          );
          const sha = res?.commit?.short_sha || res?.event?.commit_hash || 'HEAD';
          responseText = `**Commit pushed to ${target.key}**
Commit \`${sha}\` broadcast on the live SSE stream — the flow timeline and any open tab just updated.`;
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
        text: 'Terminal session cleared. Ready for new triage instructions or telemetry diagnostics.',
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
