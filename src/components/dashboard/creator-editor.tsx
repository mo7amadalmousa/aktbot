"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorBlock, EditorInitial, EditorProfile } from "@/lib/creator/editor-types";
import type { PageTheme } from "@/lib/public/page-theme";
import { BlocksPanel } from "./blocks-panel";
import { DesignPanel } from "./design-panel";
import { ProfilePanel } from "./profile-panel";
import { LivePreview } from "./live-preview";

type Tab = "content" | "design" | "profile";

export function CreatorEditor({ initial }: { initial: EditorInitial }) {
  const [profile, setProfile] = useState<EditorProfile>(initial.profile);
  const [theme, setTheme] = useState<PageTheme>(initial.theme);
  const [background, setBackground] = useState(initial.background);
  const [blocks, setBlocks] = useState<EditorBlock[]>(initial.blocks);
  const [savedUsername, setSavedUsername] = useState(initial.profile.username);

  const [tab, setTab] = useState<Tab>("content");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const touch = useCallback(() => {
    setDirty(true);
    setMessage(null);
  }, []);

  const patchProfile = (patch: Partial<EditorProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    touch();
  };
  const patchTheme = (patch: Partial<PageTheme>) => {
    setTheme((t) => ({ ...t, ...patch }));
    touch();
  };

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/creator/save", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile: {
            displayName: profile.displayName,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            username: profile.username,
            isPublished: profile.isPublished,
            socialLinks: profile.socialLinks,
          },
          theme,
          background,
          blocks: blocks.map((b) => ({
            id: b.id,
            type: b.type,
            config: b.config,
            visibility: b.visibility,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage({ kind: "err", text: data.error || "تعذّر الحفظ." });
        return;
      }
      const ids: string[] = data.blockIds ?? [];
      setBlocks((prev) => prev.map((b, i) => ({ ...b, id: ids[i] ?? b.id })));
      setSavedUsername(data.username ?? profile.username);
      setDirty(false);
      setMessage({ kind: "ok", text: "حُفظت التغييرات ✓" });
    } catch {
      setMessage({ kind: "err", text: "تعذّر الاتصال بالخادم." });
    } finally {
      setSaving(false);
    }
  }

  const publicHref = `/u/${savedUsername}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">صفحتي</h1>
          {dirty ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              تغييرات غير محفوظة
            </span>
          ) : null}
          {message ? (
            <span
              className={cn(
                "text-xs font-medium",
                message.kind === "ok" ? "text-primary" : "text-destructive",
              )}
            >
              {message.text}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ExternalLink className="size-4" /> عرض الصفحة
          </a>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-5 lg:flex-row">
        <div className="flex-1 lg:max-w-md">
          <div className="mb-4 flex gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["content", "المحتوى"],
                ["design", "التصميم"],
                ["profile", "الملف"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "content" ? (
            <BlocksPanel
              blocks={blocks}
              tabs={theme.tabs}
              onChange={(b) => {
                setBlocks(b);
                touch();
              }}
            />
          ) : null}
          {tab === "design" ? (
            <DesignPanel
              theme={theme}
              onThemeChange={patchTheme}
              background={background}
              onBackgroundChange={(bg) => {
                setBackground(bg);
                touch();
              }}
              blocks={blocks}
            />
          ) : null}
          {tab === "profile" ? (
            <ProfilePanel
              profile={profile}
              initialUsername={savedUsername}
              onChange={patchProfile}
            />
          ) : null}
        </div>

        <div className="flex-1">
          <div className="lg:sticky lg:top-5">
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-background shadow-xl">
              {/* transform يجعل عناصر position:fixed (Sticky CTA) محصورة داخل الإطار */}
              <div className="h-[600px]" style={{ transform: "translateZ(0)" }}>
                <LivePreview
                  profile={profile}
                  theme={theme}
                  background={background}
                  blocks={blocks}
                />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              معاينة حيّة — تتحدّث فوراً قبل الحفظ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
