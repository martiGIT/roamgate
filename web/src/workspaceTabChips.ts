import { agentAttentionPriority } from "./agentOrder";
import {
  type AgentStateKind,
  agentStateKind,
  paneHasAgentHistory,
} from "./components/agentSession";
import type { Pane, Tab } from "./types";

/** Tabs shown as numbered chips in a workspace row. */
export const MAX_WORKSPACE_TAB_CHIPS = 6;

export type WorkspaceTabChip = {
  tabId: string;
  number: number;
  label: string;
  focused: boolean;
  /** Most urgent agent state in the tab, in attention order. */
  status: AgentStateKind;
  /** Pane to open for this tab: its focused pane, else its first pane. */
  paneId?: string;
};

export function workspaceTabChips(
  tabs: readonly Tab[],
  panes: readonly Pick<
    Pane,
    "pane_id" | "tab_id" | "focused" | "agent" | "agent_status"
  >[],
): Map<string, WorkspaceTabChip[]> {
  const panesByTab = new Map<string, typeof panes>();
  for (const pane of panes) {
    panesByTab.set(pane.tab_id, [...(panesByTab.get(pane.tab_id) ?? []), pane]);
  }
  const chips = new Map<string, WorkspaceTabChip[]>();
  for (const tab of tabs) {
    const tabPanes = panesByTab.get(tab.tab_id) ?? [];
    let status: AgentStateKind = "unknown";
    for (const pane of tabPanes) {
      if (!paneHasAgentHistory(pane)) continue;
      const candidate = agentStateKind(pane.agent_status);
      if (agentAttentionPriority(candidate) < agentAttentionPriority(status)) {
        status = candidate;
      }
    }
    const chip: WorkspaceTabChip = {
      tabId: tab.tab_id,
      number: tab.number,
      label: tab.label,
      focused: tab.focused,
      status,
      paneId: (tabPanes.find((pane) => pane.focused) ?? tabPanes[0])?.pane_id,
    };
    chips.set(tab.workspace_id, [...(chips.get(tab.workspace_id) ?? []), chip]);
  }
  return chips;
}

/** Chips that fit, plus how many tabs the "+N" marker stands for. */
export function visibleWorkspaceTabChips(chips: readonly WorkspaceTabChip[]): {
  visible: WorkspaceTabChip[];
  hidden: number;
} {
  if (chips.length <= MAX_WORKSPACE_TAB_CHIPS) {
    return { visible: [...chips], hidden: 0 };
  }
  const visible = chips.slice(0, MAX_WORKSPACE_TAB_CHIPS - 1);
  return { visible, hidden: chips.length - visible.length };
}
