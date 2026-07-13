"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  Download,
  GraduationCap,
} from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "FILE";
  duration: string | null;
  text: string | null;
  embedUrl: string | null;
  hasAsset: boolean;
  assetName: string | null;
}
interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export function CoursePlayer({
  token,
  courseTitle,
  creatorName,
  modules,
  completed,
}: {
  token: string;
  courseTitle: string;
  creatorName: string;
  modules: CourseModule[];
  completed: string[];
}) {
  const allLessons = useMemo(
    () => modules.flatMap((m) => m.lessons),
    [modules],
  );
  const [activeId, setActiveId] = useState<string | null>(
    allLessons[0]?.id ?? null,
  );
  const [done, setDone] = useState<Set<string>>(new Set(completed));

  const active = allLessons.find((l) => l.id === activeId) ?? null;
  const total = allLessons.length;
  const doneCount = done.size;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const toggle = async (lessonId: string) => {
    // تفاؤليّ ثم مزامنة مع الخادم.
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
    try {
      const res = await fetch(`/api/learn/${token}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      const d = await res.json();
      if (d.ok && Array.isArray(d.completed)) setDone(new Set(d.completed));
    } catch {
      /* يبقى التفاؤليّ */
    }
  };

  const LessonIcon = ({ type }: { type: Lesson["type"] }) =>
    type === "VIDEO" ? (
      <PlayCircle className="size-4" />
    ) : type === "FILE" ? (
      <Download className="size-4" />
    ) : (
      <FileText className="size-4" />
    );

  return (
    <main className="flex min-h-dvh w-full flex-col bg-background lg:flex-row">
      {/* الشريط الجانبيّ — منهج الكورس */}
      <aside className="w-full shrink-0 border-b border-border bg-card lg:w-80 lg:border-b-0 lg:border-s">
        <div className="p-4">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="size-5" />
            <span className="text-xs font-medium">كورس</span>
          </div>
          <h1 className="mt-1 text-base font-bold text-foreground">
            {courseTitle}
          </h1>
          <p className="text-xs text-muted-foreground">{creatorName}</p>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>التقدّم</span>
              <span>
                {doneCount}/{total} ({pct}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <nav className="max-h-[50vh] overflow-y-auto px-3 pb-4 lg:max-h-none">
          {modules.map((m, mi) => (
            <div key={m.id} className="mb-3">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                {mi + 1}. {m.title}
              </p>
              <ul className="space-y-0.5">
                {m.lessons.map((l) => {
                  const isDone = done.has(l.id);
                  const isActive = l.id === activeId;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(l.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className={isDone ? "text-primary" : "text-muted-foreground"}>
                          {isDone ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Circle className="size-4" />
                          )}
                        </span>
                        <LessonIcon type={l.type} />
                        <span className="line-clamp-1 flex-1">{l.title}</span>
                        {l.duration ? (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {l.duration}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* المحتوى */}
      <section className="flex min-w-0 flex-1 flex-col p-5 lg:p-8">
        {!active ? (
          <div className="m-auto text-center text-sm text-muted-foreground">
            لا دروس في هذا الكورس بعد.
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="text-xl font-bold text-foreground">{active.title}</h2>

            <div className="mt-4">
              {/* فيديو تضمين */}
              {active.type === "VIDEO" && active.embedUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                  <iframe
                    src={active.embedUrl}
                    className="size-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={active.title}
                  />
                </div>
              ) : null}

              {/* فيديو مرفوع (بثّ محميّ) */}
              {active.type === "VIDEO" && !active.embedUrl && active.hasAsset ? (
                <video
                  controls
                  className="w-full rounded-xl bg-black"
                  src={`/api/learn/${token}/asset/${active.id}`}
                />
              ) : null}

              {/* نصّ */}
              {active.type === "TEXT" ? (
                <div className="whitespace-pre-line rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground">
                  {active.text || "—"}
                </div>
              ) : null}

              {/* ملف مرفق */}
              {active.type === "FILE" && active.hasAsset ? (
                <a
                  href={`/api/learn/${token}/asset/${active.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Download className="size-4" />
                  تحميل: {active.assetName || "الملف"}
                </a>
              ) : null}

              {/* حالات بلا محتوى قابل للعرض */}
              {active.type === "VIDEO" && !active.embedUrl && !active.hasAsset ? (
                <p className="text-sm text-muted-foreground">لا فيديو لهذا الدرس.</p>
              ) : null}
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => toggle(active.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                  done.has(active.id)
                    ? "bg-primary/10 text-primary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {done.has(active.id) ? (
                  <>
                    <CheckCircle2 className="size-4" /> مكتمل
                  </>
                ) : (
                  <>
                    <Circle className="size-4" /> تحديد كمكتمل
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
