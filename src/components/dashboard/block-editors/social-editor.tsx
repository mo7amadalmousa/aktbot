"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { TextInput } from "@/components/dashboard/field";
import { str, arr, asRecord } from "@/lib/public/block-config";
import {
  SOCIAL_PLATFORMS,
  platformLabel,
} from "@/lib/public/social-platforms";
import { SocialIcon } from "@/components/public/blocks/social-icons";

export function SocialEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const links = arr(config.links).map((l) => asRecord(l));
  const setLinks = (next: Record<string, unknown>[]) =>
    onChange({ ...config, links: next });
  const patch = (i: number, p: Record<string, unknown>) =>
    setLinks(links.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    setLinks(next);
  };

  return (
    <div className="space-y-2">
      {links.map((l, i) => {
        const platform = str(l.platform) || "website";
        const ph =
          SOCIAL_PLATFORMS.find((p) => p.id === platform)?.placeholder ??
          "https://…";
        return (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border p-2"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <SocialIcon platform={platform} className="size-4" />
            </span>
            <select
              value={platform}
              onChange={(e) => patch(i, { platform: e.target.value })}
              aria-label="المنصّة"
              className="h-9 w-28 shrink-0 rounded-lg border border-input bg-background px-2 text-sm text-foreground"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <TextInput
              type="url"
              value={str(l.url)}
              onChange={(v) => patch(i, { url: v })}
              placeholder={ph}
            />
            <div className="flex shrink-0 flex-col">
              <button type="button" aria-label="لأعلى" onClick={() => move(i, -1)} className="rounded p-0.5 text-muted-foreground hover:bg-muted">
                <ChevronUp className="size-3.5" />
              </button>
              <button type="button" aria-label="لأسفل" onClick={() => move(i, 1)} className="rounded p-0.5 text-muted-foreground hover:bg-muted">
                <ChevronDown className="size-3.5" />
              </button>
            </div>
            <button
              type="button"
              aria-label={`حذف ${platformLabel(platform)}`}
              onClick={() => setLinks(links.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}

      {links.length < 20 ? (
        <button
          type="button"
          onClick={() =>
            setLinks([...links, { platform: "instagram", url: "" }])
          }
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Plus className="size-4" /> إضافة رابط تواصل
        </button>
      ) : null}
    </div>
  );
}
