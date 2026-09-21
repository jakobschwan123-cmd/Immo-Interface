"use client";

// Dialog zum Verwalten der Rechtsträger (anlegen / löschen).
// Die Liste wird vom Dashboard uebergeben (dort schon abonniert).

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { addEntity, deleteEntity } from "@/lib/entities";
import { LEGAL_FORMS, type LegalForm, type Entity } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export function EntityManagerDialog({
  open,
  onOpenChange,
  entities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: Entity[];
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [legalForm, setLegalForm] = useState<LegalForm>("Privat");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error("Bitte einen Namen eingeben.");
      return;
    }
    setSaving(true);
    try {
      await addEntity({ name: name.trim(), legalForm, createdBy: user.uid });
      toast.success("Rechtsträger angelegt.");
      setName("");
    } catch (err) {
      console.error("[Rechtstraeger anlegen]", err);
      toast.error("Anlegen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entity: Entity) {
    if (
      !confirm(
        `„${entity.name}" löschen? Zugeordnete Immobilien erscheinen danach unter „Ohne Rechtsträger".`,
      )
    )
      return;
    try {
      await deleteEntity(entity.id);
      toast.success("Rechtsträger gelöscht.");
    } catch (err) {
      console.error("[Rechtstraeger loeschen]", err);
      toast.error("Löschen fehlgeschlagen.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rechtsträger verwalten</DialogTitle>
          <DialogDescription>
            Zum Beispiel Schwan GmbH, Familie Schwan GbR oder Papa privat.
          </DialogDescription>
        </DialogHeader>

        {/* Liste bestehender Rechtsträger */}
        <div className="divide-y">
          {entities.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Noch keine Rechtsträger angelegt.
            </p>
          ) : (
            entities.map((entity) => (
              <div
                key={entity.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entity.name}</span>
                  <Badge variant="secondary">{entity.legalForm}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(entity)}
                  aria-label="Löschen"
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Neuer Rechtsträger */}
        <form onSubmit={handleAdd} className="mt-2 border-t pt-4">
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="entityName">Name</Label>
              <Input
                id="entityName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Familie Schwan GbR"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Rechtsform</Label>
              <Select
                value={legalForm}
                onValueChange={(v) => setLegalForm(v as LegalForm)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_FORMS.map((lf) => (
                    <SelectItem key={lf} value={lf}>
                      {lf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              <Plus /> {saving ? "Lege an …" : "Rechtsträger anlegen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
