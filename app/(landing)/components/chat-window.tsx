import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { useOpenClaw } from "@/hooks/use-open-claw";
import { Bot, User as UserIcon } from "lucide-react";
import { clsx } from "clsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import ChatInput from "./chat-input";

interface ChatWindowProps {
    sessionKey: string | null;
}

type Message = {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    id?: string;
    timestamp?: number;
};

function extractTextFromContent(content: unknown): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((block: { type?: string; text?: string; thinking?: string; name?: string; content?: { text?: string }[] }) => {
                if (block.type === "text" && block.text) return block.text;
                if (block.type === "thinking" && block.thinking) return `[thinking] ${block.thinking}`;
                if (block.type === "toolCall" && block.name) return `[tool call: ${block.name}]`;
                if (block.type === "toolResult") {
                    const text = block.content?.map((c) => c.text).filter(Boolean).join("\n");
                    return text ? `[tool result: ${text}]` : "[tool result]";
                }
                return "";
            })
            .filter(Boolean)
            .join("\n");
    }
    return String(content ?? "");
}

export default function ChatWindow({ sessionKey }: ChatWindowProps) {
    const { call, subscribe } = useOpenClaw();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const el = scrollContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages]);

    // Fetch chat history when session changes
    useEffect(() => {
        if (!sessionKey) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Gateway method: chat.history
                // Params: { sessionKey: string, limit: number }
                // Response: { sessionKey, sessionId?, messages: Array<{ role, content, timestamp?, ... }> }
                const res: unknown = await call("chat.history", { sessionKey, limit: 200 });

                const { messages: rawMessages } = (res ?? {}) as { messages?: unknown[] };
                if (Array.isArray(rawMessages)) {
                    const validRoles: Message["role"][] = ["user", "assistant", "system", "tool"];
                    const parsed: Message[] = rawMessages
                        .map((m) => {
                            const msg = m as Record<string, unknown>;
                            const text = extractTextFromContent(msg.content);
                            if (!text) return null;
                            const r = msg.role;
                            const role: Message["role"] =
                                typeof r === "string" && validRoles.includes(r as Message["role"])
                                    ? (r as Message["role"])
                                    : "assistant";
                            return {
                                role,
                                content: text,
                                id: String(msg.id ?? msg.clientId ?? crypto.randomUUID()),
                                timestamp: typeof msg.timestamp === "number" ? msg.timestamp : undefined,
                            };
                        })
                        .filter(Boolean) as Message[];

                    setMessages(parsed);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            } finally {
                setLoading(false);
            }
        };

        setMessages([]);
        fetchHistory();
    }, [sessionKey, call]);

    // Subscribe to real-time events for this session
    useEffect(() => {
        if (!sessionKey) return;

        return subscribe((msg) => {
            if (msg.type !== "event") return;

            // The gateway broadcasts "chat" events with a payload containing sessionKey + message
            const payload = msg.payload as Record<string, unknown> | null;
            if (!payload) return;

            const eventSessionKey = payload.sessionKey;
            if (eventSessionKey !== sessionKey) return;

            // A "chat" event with a message means the agent produced a new message
            if (msg.event === "chat" && payload.message) {
                const m = payload.message as Record<string, unknown>;
                const text = extractTextFromContent(m.content);
                if (text) {
                    const validRoles: Message["role"][] = ["user", "assistant", "system", "tool"];
                    const r = m.role;
                    const role: Message["role"] =
                        typeof r === "string" && validRoles.includes(r as Message["role"]) ? (r as Message["role"]) : "assistant";
                    setMessages((prev) => [
                        ...prev,
                        {
                            role,
                            content: text,
                            id: String(m.id ?? crypto.randomUUID()),
                            timestamp: typeof m.timestamp === "number" ? m.timestamp : undefined,
                        },
                    ]);
                }
            }
        });
    }, [sessionKey, subscribe]);

    const handleSend = async () => {
        if (!inputValue.trim() || !sessionKey) return;

        const userMsg: Message = { role: "user", content: inputValue, id: crypto.randomUUID(), timestamp: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");

        try {
            // Gateway method: chat.send
            // Params: { sessionKey, message, deliver, timeoutMs, idempotencyKey }
            await call("chat.send", {
                sessionKey,
                message: userMsg.content,
                deliver: false,
                timeoutMs: 120_000,
                idempotencyKey: crypto.randomUUID(),
            });
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    if (!sessionKey) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground p-8 text-center animate-in fade-in duration-500">
                <div className="bg-background p-4 rounded-full shadow-sm mb-4 border border-border">
                    <Bot size={48} className="text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No Session Selected</h3>
                <p className="max-w-sm mt-2 text-muted-foreground">
                    Select an active agent session from the sidebar to view history and start chatting.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 h-full min-h-0 bg-background relative">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/5 p-6 min-h-0"
            >
                <div className="space-y-6 max-w-4xl mx-auto w-full">
                    {loading && (
                        <div className="text-center text-sm text-muted-foreground py-4">Loading history...</div>
                    )}
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id || idx}
                            className={clsx("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                        >
                            <div
                                className={clsx(
                                    "flex max-w-[80%] md:max-w-[70%]",
                                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                <Avatar
                                    className={clsx(
                                        "h-8 w-8 mt-1 border shadow-sm shrink-0",
                                        msg.role === "user" ? "ml-3 border-transparent" : "mr-3 border-border"
                                    )}
                                >
                                    <AvatarFallback
                                        className={clsx(
                                            "text-xs font-medium",
                                            msg.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-background text-foreground"
                                        )}
                                    >
                                        {msg.role === "user" ? <UserIcon size={14} /> : <Bot size={16} />}
                                    </AvatarFallback>
                                </Avatar>

                                <Card
                                    className={clsx(
                                        "p-4 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap border-0",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                                            : "bg-card text-card-foreground border border-border rounded-2xl rounded-tl-sm"
                                    )}
                                >
                                    {msg.content}
                                </Card>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input */}
            <ChatInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                handleSend={handleSend}
                loading={loading}
            />
        </div>
    );
}
