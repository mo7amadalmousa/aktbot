"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Upload,
  FileText,
  PlayCircle,
  ArrowRight,
  Check,
} from "lucide-react";
import { TextInput } from "@/components/dashboard/field";

type LessonType = "VIDEO" | "TEXT" | "FILE";

interface Lesson {
  id?: string;
  title: string;
  type: LessonType;
  contentRef: string;
  assetKey: string;
  assetName: string;
  duration: string;
}
interface CourseModule {
  id?: string;
  title: string;
  lessons: Lesson[];
}

const emptyLesson = (): Lesson => ({
  title: "",
  type: "TEXT",
  contentRef: "",
  assetKey: "",
  assetName: "",
  duration: "",
});

export function CourseBuilder({
  productId,
  courseTitle,
  initial,
}: {
  productId: string;
  courseTitle: string;
  initial: CourseModule[];
}) {
  const [modules, setModules] = useState<CourseModule[]>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null); // "mi:li" أثناء الرفع
  const fileRef = useRef<HTMLInputElement>(null);
  const pending = useRef<{ mi: number; li: number } | null>(null);

  const setMods = (next: CourseModule[]) => {
    setModules(next);
    setSaved(false);
  };
  const patchModule = (mi: number, patch: Partial<CourseModule>) =>
    setMods(modules.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  const patchLesson = (mi: number, li: number, patch: Partial<Lesson>) =>
    setMods(
      modules.map((m, i) =>
        i === mi
          ? { ...m, lessons: m.lessons.map((l, j) => (j === li ? { ...l, ...patch } : l)) }
          : m,
      ),
    );
  const moveModule = (mi: number, dir: -1 | 1) => {
    const j = mi + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[mi], next[j]] = [next[j], next[mi]];
    setMods(next);
  };
  const moveLesson = (mi: number, li: number, dir: -1 | 1) => {
    const ls = modules[mi].lessons;
    const j = li + dir;
    if (j < 0 || j >= ls.length) return;
    const next = [...ls];
    [next[li], next[j]] = [next[j], next[li]];
    patchModule(mi, { lessons: next });
  };

  const triggerUpload = (mi: number, li: number) => {
    pending.current = { mi, li };
    fileRef.current?.click();
  };
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const at = pending.current;
    if (!f || !at) return;
    setUploadKey(`${at.mi}:${at.li}`);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/creator/product-file", {
        method: "POST",
        body: fd,
      });
      const d = await res.json();
      if (!d.ok) setError(d.error || "تعذّر رفع الملف.");
      else patchLesson(at.mi, at.li, { assetKey: d.fileKey, assetName: d.fileName });
    } catch {
      setError("تعذّر رفع الملف.");
    } finally {
      setUploadKey(null);
      pending.current = null;
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/creator/products/${productId}/course`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
      const d = await res.json();
      if (!d.ok) setError(d.error || "تعذّر الحفظ.");
      else setSaved(true);
    } catch {
      setError("تعذّر الحفظ.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />

      <Link
        href="/dashboard/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="size-4" /> المنتجات
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">محتوى الكورس</p>
          <h1 className="text-lg font-bold text-foreground">{courseTitle}</h1>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4" />
          ) : null}
          {saved ? "حُفظ" : "حفظ المحتوى"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        {modules.map((m, mi) => (
          <div key={mi} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                وحدة {mi + 1}
              </span>
              <div className="ms-auto flex gap-1">
                <button type="button" aria-label="لأعلى" onClick={() => moveModule(mi, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" aria-label="لأسفل" onClick={() => moveModule(mi, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="حذف الوحدة"
                  onClick={() => setMods(modules.filter((_, i) => i !== mi))}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <TextInput
              value={m.title}
              onChange={(v) => patchModule(mi, { title: v })}
              placeholder="عنوان الوحدة"
            />

            <div className="mt-3 space-y-2">
              {m.lessons.map((l, li) => {
                const uploading = uploadKey === `${mi}:${li}`;
                return (
                  <div key={li} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        درس {li + 1}
                      </span>
                      <select
                        value={l.type}
                        onChange={(e) =>
                          patchLesson(mi, li, { type: e.target.value as LessonType })
                        }
                        className="h-7 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                      >
                        <option value="TEXT">نصّ</option>
                        <option value="VIDEO">فيديو</option>
                        <option value="FILE">ملف</option>
                      </select>
                      <div className="ms-auto flex gap-1">
                        <button type="button" aria-label="لأعلى" onClick={() => moveLesson(mi, li, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button type="button" aria-label="لأسفل" onClick={() => moveLesson(mi, li, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                          <ChevronDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="حذف الدرس"
                          onClick={() =>
                            patchModule(mi, {
                              lessons: m.lessons.filter((_, j) => j !== li),
                            })
                          }
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <TextInput
                        value={l.title}
                        onChange={(v) => patchLesson(mi, li, { title: v })}
                        placeholder="عنوان الدرس"
                      />

                      {l.type === "TEXT" ? (
                        <textarea
                          value={l.contentRef}
                          onChange={(e) =>
                            patchLesson(mi, li, { contentRef: e.target.value })
                          }
                          rows={4}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                          placeholder="نصّ الدرس…"
                        />
                      ) : null}

                      {l.type === "VIDEO" ? (
                        <div className="space-y-2">
                          <TextInput
                            type="url"
                            value={l.contentRef}
                            onChange={(v) => patchLesson(mi, li, { contentRef: v })}
                            placeholder="رابط تضمين (YouTube/Vimeo…) — أو ارفع فيديو"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => triggerUpload(mi, li)}
                              disabled={uploading}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                            >
                              {uploading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Upload className="size-3.5" />
                              )}
                              رفع فيديو
                            </button>
                            {l.assetKey ? (
                              <span className="inline-flex items-center gap-1 text-xs text-primary">
                                <PlayCircle className="size-3.5" /> {l.assetName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {l.type === "FILE" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => triggerUpload(mi, li)}
                            disabled={uploading}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60"
                          >
                            {uploading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Upload className="size-3.5" />
                            )}
                            رفع ملف
                          </button>
                          {l.assetKey ? (
                            <span className="inline-flex items-center gap-1 text-xs text-primary">
                              <FileText className="size-3.5" /> {l.assetName}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <TextInput
                        value={l.duration}
                        onChange={(v) => patchLesson(mi, li, { duration: v })}
                        placeholder="المدّة (اختياري، مثل 8:30)"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  patchModule(mi, { lessons: [...m.lessons, emptyLesson()] })
                }
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="size-4" /> إضافة درس
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setMods([...modules, { title: "", lessons: [] }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Plus className="size-4" /> إضافة وحدة
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        فيديوهات/ملفّات الدروس تُخزَّن خاصّةً ولا تُخدَم علناً — تُبَثّ فقط للمشتري
        داخل مشغّل الكورس.
      </p>
    </div>
  );
}
