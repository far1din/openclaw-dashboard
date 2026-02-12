"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

interface DeleteAgentDialogProps {
    agentId: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: (agentId: string) => Promise<void>;
}

export function DeleteAgentDialog({ agentId, onOpenChange, onConfirm }: DeleteAgentDialogProps) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!agentId) return;

        setLoading(true);
        try {
            await onConfirm(agentId);
            onOpenChange(false);
        } catch (err: any) {
            alert(`Failed to delete agent: ${err?.message || err?.code || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={!!agentId} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Agent</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete agent <strong>{agentId}</strong>? This will remove its workspace
                        and all associated data. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : "Delete Agent"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
