"use client";

import { useEffect, useState } from "react";
import { useOpenClaw } from "@/hooks/use-open-claw";
import { Bot, Loader2 } from "lucide-react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Agent = {
    id: string;
    name?: string;
    emoji?: string;
    workspace?: string;
};

export function AgentList() {
    const { call, isConnected } = useOpenClaw();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAgents = async () => {
        if (!isConnected) return;
        setLoading(true);

        try {
            // Approach A: try the 'status' method which includes per-agent data
            const res: any = await call("status");
            console.log("status response:", res);

            let parsed = parseAgentsFromStatus(res);
            if (parsed.length > 0) {
                setAgents(parsed);
                return;
            }

            // Approach B: fall back to deriving agent IDs from session keys
            console.log("No agents in status response, falling back to sessions...");
            const sessionsRes: any = await call("sessions.list", { limit: 100 });
            const sessionList: any[] = sessionsRes?.sessions ?? (Array.isArray(sessionsRes) ? sessionsRes : []);

            const agentIds = [
                ...new Set(
                    sessionList
                        .map((s: any) => {
                            // Session keys follow the pattern agent:<agentId>:<mainKey>
                            const parts = (s.key || "").split(":");
                            if (parts[0] === "agent" && parts[1]) return parts[1];
                            return null;
                        })
                        .filter(Boolean) as string[]
                ),
            ];

            setAgents(agentIds.map((id) => ({ id })));
        } catch (err) {
            console.error("Failed to fetch agents:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected) {
            fetchAgents();
        }
    }, [isConnected]);

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Agents</SidebarGroupLabel>
            <SidebarMenu>
                {!isConnected && (
                    <div className="text-center text-sm text-muted-foreground py-4">Connecting...</div>
                )}
                {isConnected && loading && (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                    </div>
                )}
                {isConnected && !loading && agents.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">No agents found</div>
                )}
                {agents.map((agent) => (
                    <SidebarMenuItem key={agent.id}>
                        <SidebarMenuButton className="h-auto py-2 cursor-default">
                            <Avatar className="size-8 rounded-lg">
                                <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-sidebar-primary text-xs">
                                    {agent.emoji || <Bot className="size-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">
                                    {agent.name || agent.id}
                                </span>
                                {agent.name && (
                                    <span className="truncate text-xs text-muted-foreground">
                                        {agent.id}
                                    </span>
                                )}
                                {agent.workspace && (
                                    <span className="truncate text-xs text-muted-foreground">
                                        {agent.workspace}
                                    </span>
                                )}
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

/**
 * Try to extract agent info from the 'status' response payload.
 * The exact shape is not fully documented, so we try several common patterns
 * and log what we find.
 */
function parseAgentsFromStatus(res: any): Agent[] {
    if (!res) return [];

    // Pattern 1: res.agents is an array of { id, identity: { name, emoji, ... } }
    if (Array.isArray(res.agents)) {
        return res.agents.map((a: any) => ({
            id: a.id || a.agentId || "unknown",
            name: a.identity?.name || a.name,
            emoji: a.identity?.emoji || a.emoji,
            workspace: a.identity?.workspace || a.workspace,
        }));
    }

    // Pattern 2: res.agents is an object keyed by agent id
    if (res.agents && typeof res.agents === "object" && !Array.isArray(res.agents)) {
        return Object.entries(res.agents).map(([id, data]: [string, any]) => ({
            id,
            name: data?.identity?.name || data?.name,
            emoji: data?.identity?.emoji || data?.emoji,
            workspace: data?.identity?.workspace || data?.workspace,
        }));
    }

    // Pattern 3: res.agentStores or res.sessionStores keyed by agent id
    const stores = res.agentStores || res.sessionStores;
    if (stores && typeof stores === "object") {
        return Object.keys(stores).map((id) => ({ id }));
    }

    // Pattern 4: res.config?.agents?.list
    if (Array.isArray(res.config?.agents?.list)) {
        return res.config.agents.list.map((a: any) => ({
            id: a.id || "unknown",
            name: a.identity?.name,
            emoji: a.identity?.emoji,
            workspace: a.workspace,
        }));
    }

    return [];
}
