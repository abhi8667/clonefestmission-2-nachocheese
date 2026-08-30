import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Radio,
  Zap,
  Activity,
  Layers,
  Clock,
  Code2,
  Terminal,
  Database,
  Cpu,
  FileCode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import GlowCursor from '../components/Cyber/GlowCursor.tsx';

export const LandingView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <GlowCursor
      color="#ea580c"
      secondaryColor="#f59e0b"
      trailLength={40}
      trailWidth={8}
      glowIntensity={1.85}
      glowSpread={1.25}
      hotspot={0.7}
      brightness={1.25}
      blendMode="screen"
      className="min-h-screen bg-[#080808] text-[#F2F1EA] font-mono selection:bg-[#ea580c] selection:text-[#080808] relative overflow-x-hidden"
    >
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b-2 border-border/40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-foreground text-background flex items-center justify-center font-black rounded-xs shadow-sm">
            <Shield className="w-4 h-4 text-background" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black tracking-widest uppercase text-foreground">
              TRIARC
            </span>
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase hidden sm:inline-block">
              SYSTEM v3.2
            </span>
          </div>
        </div>

        <nav aria-label="Landing Navigation" className="flex items-center gap-3">
          <a
            href="#problem"
            className="text-xs uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hidden md:inline-block font-mono"
          >
            The Problem
          </a>
          <a
            href="#features"
            className="text-xs uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hidden md:inline-block font-mono"
          >
            Architecture
          </a>
          <a
            href="#how-it-works"
            className="text-xs uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hidden md:inline-block font-mono"
          >
            Flow Pipeline
          </a>
          <a
            href="#stack"
            className="text-xs uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hidden sm:inline-block font-mono"
          >
            Stack
          </a>

          <Link
            to="/login?from=/projects&demo=alex"
            className="px-3 py-1.5 bg-[#121212] hover:bg-[#1a1a1a] text-foreground border border-border hover:border-foreground text-xs font-bold uppercase transition-all rounded-xs focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
          >
            Demo Access
          </Link>
          <Link
            to="/login?from=/projects"
            className="px-3.5 py-1.5 bg-foreground text-background hover:bg-white text-xs font-bold uppercase tracking-wider transition-all rounded-xs shadow-sm focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none flex items-center gap-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      <main id="landing-main" className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16 space-y-20 sm:space-y-28">
        {/* ========================================================================= */}
        {/* SECTION 1: FULL SCREEN CENTERED HERO                                      */}
        {/* ========================================================================= */}
        <section
          aria-labelledby="hero-heading"
          className="min-h-[82vh] sm:min-h-[88vh] flex flex-col items-center justify-center text-center space-y-8 py-12 relative"
        >
          <div className="space-y-6 max-w-4xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121212] border border-border text-[11px] font-bold text-[#ea580c] uppercase rounded-xs tracking-widest">
              <Activity className="w-3.5 h-3.5 animate-pulse text-[#ea580c]" />
              <span>DEFECT TELEMETRY &amp; FLOW MATRIX</span>
            </div>

            <h1
              id="hero-heading"
              className="text-6xl sm:text-8xl md:text-9xl font-black text-foreground uppercase tracking-tight leading-none select-none font-mono"
            >
              TRIARC
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-muted-foreground uppercase leading-relaxed max-w-2xl font-mono">
              Bugzilla tracked where a bug is.{' '}
              <span className="text-[#ea580c] font-bold">
                Triarc tracks how fast it&apos;s moving and why it&apos;s stuck
              </span>{' '}
              — by connecting the tracker to the code.
            </p>

            {/* Central Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full max-w-md">
              <Link
                to="/login?from=/projects&demo=alex"
                className="w-full sm:w-auto px-8 py-4 bg-foreground text-background hover:bg-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all rounded-xs shadow-lg focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
              >
                <span>EXPLORE DEMO</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/login?from=/projects"
                className="w-full sm:w-auto px-8 py-4 bg-[#121212] hover:bg-[#1a1a1a] text-foreground border-2 border-border hover:border-[#ea580c] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-xs focus-visible:ring-2 focus-visible:ring-[#ea580c] outline-none"
              >
                <span>SIGN IN / SIGN UP</span>
                <ChevronRight className="w-4 h-4 text-[#ea580c]" />
              </Link>
            </div>
          </div>

          {/* Subtle scroll down indicator */}
          <a
            href="#live-preview"
            className="pt-8 text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-widest flex items-center gap-1.5 transition-colors font-mono"
          >
            <span>INSPECT TELEMETRY ARCHITECTURE</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-90 text-[#ea580c]" />
          </a>
        </section>

        {/* Live Preview Container */}
        <section id="live-preview" aria-label="Live flow timeline preview" className="pt-6">

          {/* Above-the-fold Flow Timeline Live Preview */}
          <div className="brutalist-card p-4 sm:p-6 bg-[#0d0d0d] border-2 border-border shadow-brutalist rounded-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 bg-[#ea580c] text-background font-black uppercase rounded-xs">
                  CORE-412
                </span>
                <span className="font-bold text-foreground uppercase truncate max-w-xs sm:max-w-md">
                  Crash on save when offline with network disconnected
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-muted-foreground uppercase">Flow Latency: <strong className="text-foreground">22.4h</strong></span>
                <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-600 font-bold uppercase rounded-xs">
                  STALLED IN REVIEW
                </span>
              </div>
            </div>

            {/* Pipeline Stage Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2 text-center text-xs font-mono">
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">1. REPORTED</span>
                <span className="text-xs font-bold text-foreground uppercase">Unconfirmed</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">0.2h</span>
              </div>
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">2. TRIAGED</span>
                <span className="text-xs font-bold text-foreground uppercase">Confirmed</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">1.1h</span>
              </div>
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">3. BRANCHED</span>
                <span className="text-xs font-bold text-emerald-400 uppercase">fix/412-sync</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">2.5h</span>
              </div>
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">4. PR OPEN</span>
                <span className="text-xs font-bold text-foreground uppercase">PR #88</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">0.8h</span>
              </div>
              <div className="p-2.5 bg-amber-950/40 border-2 border-amber-500 text-amber-300 rounded-xs shadow-sm">
                <span className="text-[9px] text-amber-400 uppercase block font-black flex items-center justify-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> 5. REVIEW?
                </span>
                <span className="text-xs font-black uppercase">review? @alex</span>
                <span className="text-[9px] text-amber-300 font-bold block mt-0.5">16.8h (STALLED)</span>
              </div>
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs opacity-60">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">6. MERGED</span>
                <span className="text-xs font-bold text-muted-foreground uppercase">Pending</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">—</span>
              </div>
              <div className="p-2.5 bg-[#141414] border border-border rounded-xs opacity-60">
                <span className="text-[9px] text-muted-foreground uppercase block font-bold">7. VERIFIED</span>
                <span className="text-xs font-bold text-muted-foreground uppercase">Pending</span>
                <span className="text-[9px] text-muted-foreground block mt-0.5">—</span>
              </div>
            </div>

            {/* Telemetry Metric Summary Row */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>GITHUB WEBHOOK INTEGRATION: <code className="text-foreground">github.com/triarc/core</code></span>
              </div>
              <div className="flex items-center gap-4">
                <span>ACTIVE OPERATORS: <strong className="text-foreground">4</strong></span>
                <span>SECURITY LEVEL: <strong className="text-emerald-400">UNCLASSIFIED</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: THE PROBLEM (THREE-COLUMN GROUNDED CONTRAST)                  */}
        {/* ========================================================================= */}
        <section id="problem" aria-labelledby="problem-heading" className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase block">
              PARADIGM COMPARISON
            </span>
            <h2 id="problem-heading" className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              The Evolution of Defect Tracking
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase max-w-2xl font-mono">
              Trackers fail when they measure human status dropdowns instead of code-level event velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Legacy Trackers */}
            <div className="brutalist-card p-6 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">01 / LEGACY TRACKERS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1a1a1a] text-muted-foreground uppercase rounded-xs">
                  e.g. Bugzilla
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase">
                  Static State Repository
                </h3>
                <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                  Measures manual status dropdowns. Siloed from code repositories with zero visibility into branch activity or pull request review queues.
                </p>
              </div>
              <div className="p-3 bg-[#080808] border border-border text-[11px] font-mono text-muted-foreground uppercase">
                <span className="text-foreground font-bold block mb-0.5">Primary Metric:</span>
                Open / Resolved state counts
              </div>
            </div>

            {/* Column 2: Modern Trackers */}
            <div className="brutalist-card p-6 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">02 / MODERN TRACKERS</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#1a1a1a] text-muted-foreground uppercase rounded-xs">
                  e.g. Jira / Linear
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase">
                  Sprint Velocity Boards
                </h3>
                <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                  Measures estimated story points and manual card moves. Treats defect resolution as task completion rather than flow latency through engineering stages.
                </p>
              </div>
              <div className="p-3 bg-[#080808] border border-border text-[11px] font-mono text-muted-foreground uppercase">
                <span className="text-foreground font-bold block mb-0.5">Primary Metric:</span>
                Sprint burn-down & story point velocity
              </div>
            </div>

            {/* Column 3: Triarc */}
            <div className="brutalist-card-orange p-6 bg-[#0d0d0d] border-2 border-[#ea580c] rounded-xs space-y-4 shadow-brutalist">
              <div className="flex items-center justify-between border-b border-[#ea580c]/40 pb-3">
                <span className="text-xs font-black text-[#ea580c] uppercase">03 / TRIARC TELEMETRY</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#ea580c] text-background font-black uppercase rounded-xs">
                  Code-Coupled
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase">
                  Flow Latency & Code Linkage
                </h3>
                <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                  Measures actual stage-by-stage cycle times via automated webhook transitions, highlighting quiet branches, stalled reviews, and typed approval blocks.
                </p>
              </div>
              <div className="p-3 bg-[#120a05] border border-[#ea580c]/60 text-[11px] font-mono text-foreground uppercase">
                <span className="text-[#ea580c] font-bold block mb-0.5">Primary Metric:</span>
                Stage duration & review stall latency
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: FEATURE TRIPTYCH                                              */}
        {/* ========================================================================= */}
        <section id="features" aria-labelledby="features-heading" className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase block">
              CORE CAPABILITIES
            </span>
            <h2 id="features-heading" className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              Engineered for Defect Velocity
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase max-w-2xl font-mono">
              Three interconnected subsystems that eliminate triage bottlenecks and maintain visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feature 1: Flow Visualization */}
            <article className="brutalist-card p-6 bg-[#0d0d0d] border-2 border-border rounded-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-bold rounded-xs">
                  <Activity className="w-5 h-5 text-background" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground uppercase">
                    1. Flow Visualization
                  </h3>
                  <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                    Per-bug unified timeline tracking every transition from report to verification. Detects quiet branches (&gt;3 days) and flags stalled review segments (&gt;24h).
                  </p>
                </div>

                {/* Inline Visual Simulation */}
                <div className="p-3.5 bg-[#080808] border border-border font-mono text-[11px] space-y-2 rounded-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                    <span>STAGE</span>
                    <span>DURATION</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Triage → In Progress</span>
                    <span className="text-muted-foreground">3.2h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Branch → PR #88</span>
                    <span className="text-muted-foreground">1.4h</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-300 font-bold bg-amber-950/30 px-1 py-0.5 border border-amber-600/40 rounded-xs">
                    <span>Review? @alex</span>
                    <span>16.8h (STALLED)</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground uppercase border-t border-border pt-3">
                <strong>Solves:</strong> Invisible review bottlenecks and stale development branches.
              </div>
            </article>

            {/* Feature 2: Request Inbox */}
            <article className="brutalist-card p-6 bg-[#0d0d0d] border-2 border-border rounded-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-bold rounded-xs">
                  <Inbox className="w-5 h-5 text-background" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground uppercase">
                    2. Request Inbox
                  </h3>
                  <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                    Typed, role-gated requests (<code className="text-[#ea580c]">review?</code>, <code className="text-blue-400">needinfo?</code>, <code className="text-purple-400">approval+</code>) structured into incoming actions and outgoing blockers.
                  </p>
                </div>

                {/* Inline Visual Simulation */}
                <div className="p-3.5 bg-[#080808] border border-border font-mono text-[11px] space-y-2 rounded-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                    <span>INCOMING QUEUE</span>
                    <span>STATUS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">#412 review? by @sam</span>
                    <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 border border-amber-600 text-[9px] font-bold">WAITING</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">#398 needinfo? by @priya</span>
                    <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 border border-blue-600 text-[9px] font-bold">PENDING</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">#305 sec_approval+</span>
                    <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-600 text-[9px] font-bold">GRANTED</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground uppercase border-t border-border pt-3">
                <strong>Solves:</strong> Ambiguous handoffs, untracked questions, and unassigned code reviews.
              </div>
            </article>

            {/* Feature 3: Live Duplicate Radar */}
            <article className="brutalist-card p-6 bg-[#0d0d0d] border-2 border-border rounded-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-bold rounded-xs">
                  <Radio className="w-5 h-5 text-[#ea580c]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground uppercase">
                    3. Live Duplicate Radar
                  </h3>
                  <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                    Token vector embedding similarity calculates duplicate probabilities in real-time as reports are typed, enforcing strict row-level security boundaries.
                  </p>
                </div>

                {/* Inline Visual Simulation */}
                <div className="p-3.5 bg-[#080808] border border-border font-mono text-[11px] space-y-2 rounded-xs">
                  <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-1.5">
                    <span>MATCH CONFIDENCE</span>
                    <span>EXISTING INCIDENT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold">89% SIMILAR</span>
                    <span className="text-foreground">#412 Offline crash</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">42% SIMILAR</span>
                    <span className="text-muted-foreground">#305 Cache sync</span>
                  </div>
                  <div className="p-1.5 bg-[#121212] text-[10px] text-muted-foreground uppercase border border-border rounded-xs">
                    Security Group filter applied (no confidential leaks)
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground uppercase border-t border-border pt-3">
                <strong>Solves:</strong> Duplicate reports flooding queues and fragmented bug investigations.
              </div>
            </article>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: HOW IT WORKS (MINIMAL 4-STEP PIPELINE DIAGRAM)                 */}
        {/* ========================================================================= */}
        <section id="how-it-works" aria-labelledby="pipeline-heading" className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase block">
              EXECUTION PIPELINE
            </span>
            <h2 id="pipeline-heading" className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              From Report to Verified Fix
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase max-w-2xl font-mono">
              Four deterministic stages linking bug tracker state to live version control.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: File */}
            <div className="brutalist-card p-5 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-muted-foreground">01</span>
                <span className="px-2 py-0.5 bg-[#141414] text-[10px] font-bold text-foreground border border-border uppercase rounded-xs">
                  INPUT
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase">
                1. File Report
              </h3>
              <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                Reporter submits details. Duplicate Radar runs real-time semantic matching to intercept repeated bugs.
              </p>
            </div>

            {/* Step 2: Triage */}
            <div className="brutalist-card p-5 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-muted-foreground">02</span>
                <span className="px-2 py-0.5 bg-[#141414] text-[10px] font-bold text-foreground border border-border uppercase rounded-xs">
                  GATE
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase">
                2. Triage & Assign
              </h3>
              <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                Triager verifies component, priority, and milestone. Issues typed flags (<code className="text-[#ea580c]">needinfo?</code>) if repro steps are missing.
              </p>
            </div>

            {/* Step 3: Work in Git */}
            <div className="brutalist-card p-5 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-muted-foreground">03</span>
                <span className="px-2 py-0.5 bg-[#ea580c] text-[10px] font-black text-background uppercase rounded-xs">
                  AUTOMATED
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase">
                3. Work in Git
              </h3>
              <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                Developer cuts branch and opens PR. Webhooks automatically advance status to In Progress and In Review.
              </p>
            </div>

            {/* Step 4: Verify */}
            <div className="brutalist-card p-5 bg-[#0d0d0d] border-2 border-border rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-muted-foreground">04</span>
                <span className="px-2 py-0.5 bg-[#141414] text-[10px] font-bold text-foreground border border-border uppercase rounded-xs">
                  AUDIT
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase">
                4. Verify & Settle
              </h3>
              <p className="text-xs text-muted-foreground uppercase leading-relaxed font-mono">
                Reviewer grants <code className="text-emerald-400">review+</code>. PR merge automatically resolves the bug and records full flow latency metrics.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: BUILT ON (TECHNICAL STACK HONESTY)                             */}
        {/* ========================================================================= */}
        <section id="stack" aria-labelledby="stack-heading" className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] text-[#ea580c] font-bold tracking-widest uppercase block">
              ARCHITECTURE SPECIFICATION
            </span>
            <h2 id="stack-heading" className="text-xl sm:text-3xl font-black text-foreground uppercase tracking-tight">
              Built on Deterministic Foundations
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground uppercase max-w-2xl font-mono">
              Engineered for low latency and zero external SaaS dependencies.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Code2 className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-bold text-foreground uppercase block">React 18 + Vite</span>
              <span className="text-[10px] text-muted-foreground uppercase block">TypeScript UI</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Database className="w-4 h-4 text-foreground" />
              <span className="text-xs font-bold text-foreground uppercase block">SQLite (WAL)</span>
              <span className="text-[10px] text-muted-foreground uppercase block">&lt;150ms Queries</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Terminal className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-bold text-foreground uppercase block">Express + TS</span>
              <span className="text-[10px] text-muted-foreground uppercase block">Node.js API</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Cpu className="w-4 h-4 text-foreground" />
              <span className="text-xs font-bold text-foreground uppercase block">Token Vectors</span>
              <span className="text-[10px] text-muted-foreground uppercase block">Local Dedup</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Radio className="w-4 h-4 text-[#ea580c]" />
              <span className="text-xs font-bold text-foreground uppercase block">SSE Stream</span>
              <span className="text-[10px] text-muted-foreground uppercase block">Live Telemetry</span>
            </div>

            <div className="p-4 bg-[#0d0d0d] border border-border rounded-xs space-y-1.5">
              <Shield className="w-4 h-4 text-foreground" />
              <span className="text-xs font-bold text-foreground uppercase block">Zero Trust Auth</span>
              <span className="text-[10px] text-muted-foreground uppercase block">Row-Level Security</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: FOOTER                                                        */}
        {/* ========================================================================= */}
        <footer className="border-t-2 border-border pt-8 pb-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-foreground text-background flex items-center justify-center font-bold rounded-xs">
              <Shield className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-bold text-foreground uppercase tracking-wider">
              TRIARC DEFECT TELEMETRY
            </span>
            <span className="text-[10px] text-muted-foreground uppercase border-l border-border pl-3">
              CloneFest 2026
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              to="/login?from=/projects"
              className="text-foreground hover:text-[#ea580c] font-bold uppercase transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/login?from=/projects&demo=alex"
              className="text-foreground hover:text-[#ea580c] font-bold uppercase transition-colors"
            >
              Demo Access
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground uppercase transition-colors inline-flex items-center gap-1"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </main>
    </GlowCursor>
  );
};
