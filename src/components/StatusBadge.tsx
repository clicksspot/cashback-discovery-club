import { Badge } from "@/components/ui/badge";

const STYLES: Record<string, string> = {
  pending: "bg-warning/25 text-warning-foreground",
  approved: "bg-primary/15 text-primary",
  paid: "bg-forest text-forest-foreground",
  success: "bg-primary/15 text-primary",
  running: "bg-warning/25 text-warning-foreground",
  declined: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
  error: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={`border-0 capitalize ${STYLES[status] ?? "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}
