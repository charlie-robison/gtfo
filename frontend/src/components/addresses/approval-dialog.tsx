"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Check, X, Shield } from "lucide-react";
import { AddressAccount } from "@/types";
import { mockUser } from "@/data/mock-user";

interface ApprovalDialogProps {
  service: AddressAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApprovalDialog({
  service,
  open,
  onOpenChange,
}: ApprovalDialogProps) {
  if (!service) return null;

  const oldAddr = mockUser.oldAddress;
  const newAddr = mockUser.newAddress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Review Address Update
          </DialogTitle>
          <DialogDescription>
            Confirm the address change for{" "}
            <span className="font-medium text-foreground">
              {service.serviceName}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Current Address
              </p>
              <p className="text-sm line-through text-muted-foreground">
                {oldAddr.street}
                <br />
                {oldAddr.city}, {oldAddr.state} {oldAddr.zip}
              </p>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                New Address
              </p>
              <p className="text-sm font-medium text-green-400">
                {newAddr.street}
                <br />
                {newAddr.city}, {newAddr.state} {newAddr.zip}
              </p>
            </div>
          </div>

          <Separator />

          <div className="rounded-lg border p-3 bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Pre-filled Form Preview
            </p>
            <div className="bg-muted rounded p-3 font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Street:</span>
                <span>{newAddr.street}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">City:</span>
                <span>{newAddr.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State:</span>
                <span>{newAddr.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ZIP:</span>
                <span>{newAddr.zip}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">
              {service.priority} priority
            </Badge>
            <span>&middot;</span>
            <span>{service.emailsFound} emails found</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-1"
          >
            <X className="w-3 h-3" />
            Reject
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="gap-1 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-3 h-3" />
            Approve Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
