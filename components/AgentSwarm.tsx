"use client";

import { CheckCircle2, Loader2, Search, Target, PenTool } from "lucide-react";

export type AgentPhase = "qualifier" | "competitors" | "briefing";
export type AgentStatus = "pending" | "running" | "complete";

export interface AgentState {
  status: AgentStatus;
  /** Free-form result blurb shown under the agent name once complete. */
  result?: string;
}

export interface SwarmState {
  qualifier: AgentState;
  competitors: AgentState;
  briefing: AgentState;
}

export const INITIAL_SWARM: SwarmState = {
  qualifier: { status: "pending" },
  competitors: { status: "pending" },
  briefing: { status: "pending" },
};

interface AgentMeta {
  phase: AgentPhase;
  name: string;
  role: string;
  Icon: typeof Search;
  workingCopy: string;
}

const AGENTS: AgentMeta[] = [
  {
    phase: "qualifier",
    name: "Business Qualifier",
    role: "Reads your homepage and classifies what you actually do.",
    Icon: Search,
    workingCopy: "Fetching your homepage and reading what you do…",
  },
  {
    phase: "competitors",
    name: "Competitor Scout",
    role: "Identifies the 3 brands most likely competing for your audience.",
    Icon: Target,
    workingCopy: "Hunting down your top 3 direct competitors…",
  },
  {
    phase: "briefing",
    name: "Strategy Writer",
    role: "Drafts a custom 30 / 90-day plan in plain English.",
    Icon: PenTool,
    workingCopy: "Writing your custom 30 / 90-day strategy…",
  },
];

interface AgentSwarmProps {
  swarm: SwarmState;
}

export default function AgentSwarm({ swarm }: AgentSwarmProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-600">
          Live · 3 agents working
        </p>
        <h3 className="text-lg font-semibold text-stone-900">
          Your AI marketing team is on it.
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          You&apos;ll see each agent finish in real time. Total run: about 15
          seconds.
        </p>
      </div>

      <ol className="space-y-3">
        {AGENTS.map((meta, idx) => (
          <AgentCard
            key={meta.phase}
            meta={meta}
            state={swarm[meta.phase]}
            index={idx}
          />
        ))}
      </ol>
    </div>
  );
}

interface AgentCardProps {
  meta: AgentMeta;
  state: AgentState;
  index: number;
}

function AgentCard({ meta, state, index }: AgentCardProps) {
  const { Icon, name, role, workingCopy } = meta;
  const { status, result } = state;

  // Visual hierarchy: complete agents fade slightly, running agent pops,
  // pending agents look dormant.
  const containerClass =
    status === "running"
      ? "border-teal-300 bg-teal-50/40 shadow-sm ring-2 ring-teal-100"
      : status === "complete"
      ? "border-stone-200 bg-white"
      : "border-stone-200 bg-stone-50/60";

  const iconWrapClass =
    status === "running"
      ? "bg-teal-100 text-teal-700"
      : status === "complete"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-stone-200 text-stone-500";

  return (
    <li
      className={`flex gap-4 rounded-xl border p-4 transition-all duration-300 ${containerClass}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${iconWrapClass}`}
      >
        <Icon size={18} strokeWidth={2} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-sm font-semibold text-stone-900">
            <span className="mr-2 text-stone-400 tabular-nums">
              0{index + 1}
            </span>
            {name}
          </h4>
          <StatusPill status={status} />
        </div>

        <p className="mt-0.5 text-xs text-stone-500">{role}</p>

        {status === "running" && (
          <p className="mt-2 flex items-center gap-2 text-sm text-teal-700">
            <span className="inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
              <span
                className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500"
                style={{ animationDelay: "300ms" }}
              />
            </span>
            <span>{workingCopy}</span>
          </p>
        )}

        {status === "complete" && result && (
          <p className="mt-2 line-clamp-3 text-sm text-stone-700">{result}</p>
        )}
      </div>
    </li>
  );
}

function StatusPill({ status }: { status: AgentStatus }) {
  if (status === "complete") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={12} />
        Done
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-700">
        <Loader2 size={12} className="animate-spin" />
        Working
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">
      Queued
    </span>
  );
}
