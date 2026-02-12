"use client";

import { useState, useCallback } from "react";
import { AppSidebar } from "./components/app-sidebar";
import ChatWindow from "./components/chat-window";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Home() {
    const [activeSession, setActiveSession] = useState<string | null>(null);

    // When an agent is clicked, create a fresh session key for a new conversation
    const handleSelectAgent = useCallback((agentId: string) => {
        const sessionId = `web-${Date.now().toString(36)}`;
        const sessionKey = `agent:${agentId}:${sessionId}`;
        setActiveSession(sessionKey);
    }, []);

    // Derive a readable label from the session key (e.g. "agent:scout:web-abc" → "scout")
    const breadcrumbLabel = activeSession
        ? activeSession.split(":")[1] ?? activeSession
        : "Dashboard";

    return (
        <SidebarProvider style={{ height: "100vh", overflow: "hidden" }}>
            <AppSidebar
                onSelectSession={setActiveSession}
                onSelectAgent={handleSelectAgent}
                activeSessionKey={activeSession}
            />
            <SidebarInset className="flex flex-col h-full overflow-hidden">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background z-10">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href="#">OpenClaw</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </header>
                <div className="flex flex-1 flex-col bg-background min-h-0">
                    <ChatWindow sessionKey={activeSession} />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
