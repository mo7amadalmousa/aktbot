"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Eye, Save, UploadCloud, Rocket, Undo2, X, Plus, Trash2, ArrowUp, ArrowDown, Loader2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Overrides, FieldType, ListItem } from "@/lib/cms/fields";
import { CmsContextProvider, type ListFieldDef } from "./cms-context";

interface EditorState {
  open: boolean;
  field: string;
  type: FieldType;
  value: unknown;
  listFields?: ListFieldDef[];
  defText?: string;
  defHref?: string;
}

const CLOSED: EditorState = { open: false, field: "", type: "text", value: "" };

// ── متحكّم التحرير الموضعيّ (أدمن فقط · dynamic) ───────────────────────
export function CmsAdmin({
  pageKey,
  locale,
  published,
  draft,
  children,
}: {
  pageKey: string;
  locale: string;
  published: Overrides;
  draft: Overrides;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Overrides>({ ...published, ...draft });
  const [editMode, setEditMode] = useState(false);
  const [dirty, setDirty] = useState(Object.keys(draft).length > 0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [ed, setEd] = useState<EditorState>(CLOSED);

  const setField = useCallback((key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
  }, []);

  const toggleSection = useCallback((id: string) => {
    const key = `visible.${id}`;
    setValues((v) => ({ ...v, [key]: v[key] === false }));
    setDirty(true);
  }, []);

  const openEditor = useCallback(
    (field: string, type: FieldType, current: unknown, opts?: { listFields?: ListFieldDef[]; defText?: string; defHref?: string }) => {
      setEd({ open: true, field, type, value: current, listFields: opts?.listFields, defText: opts?.defText, defHref: opts?.defHref });
    },
    [],
  );

  const persist = async (action: "save" | "publish" | "discard") => {
    setBusy(true);
    setSaved(null);
    const res = await fetch(`/api/admin/page-content/${pageKey}/${locale}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, overrides: values }),
    });
    setBusy(false);
    if (res.ok) {
      if (action === "discard") {
        setValues({ ...published });
        setDirty(false);
      } else {
        setDirty(action === "save" ? false : false);
      }
      setSaved(action);
      setTimeout(() => setSaved(null), 2500);
      if (action === "publish") router.refresh();
    }
  };

  const api = useMemo(
    () => ({ editMode, dirty, busy, openEditor, toggleSection }),
    [editMode, dirty, busy, openEditor, toggleSection],
  );

  return (
    <CmsContextProvider value={{ values, admin: api }}>
      {children}

      {/* شريط أدوات التحرير — عائم أسفل الصفحة (أدمن فقط) */}
      <div className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="me-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <span className="flex size-5 items-center justify-center rounded bg-primary text-[10px] text-primary-foreground">A</span>
            محرّر AktBot
          </span>
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
              editMode ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted",
            )}
          >
            {editMode ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
            {editMode ? "معاينة" : "تحرير"}
          </button>
          <button type="button" onClick={() => persist("save")} disabled={busy || !dirty} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} حفظ مسوّدة
          </button>
          <button type="button" onClick={() => persist("publish")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Rocket className="size-3.5" /> نشر
          </button>
          <button type="button" onClick={() => persist("discard")} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40" title="تجاهل المسوّدة">
            <Undo2 className="size-3.5" />
          </button>
          {dirty ? <span className="text-[11px] text-amber-600 dark:text-amber-400">مسوّدة غير محفوظة</span> : null}
          {saved ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
              <Check className="size-3.5" /> {saved === "publish" ? "نُشر" : saved === "discard" ? "أُلغيت المسوّدة" : "حُفظت المسوّدة"}
            </span>
          ) : null}
        </div>
      </div>

      {ed.open ? (
        <FieldEditor
          state={ed}
          onClose={() => setEd(CLOSED)}
          onSave={(val) => {
            if (ed.type === "link") {
              const o = val as { text: string; href: string };
              setField(`${ed.field}.text`, o.text);
              setField(`${ed.field}.href`, o.href);
            } else {
              setField(ed.field, val);
            }
            setEd(CLOSED);
          }}
        />
      ) : null}
    </CmsContextProvider>
  );
}

// ── نافذة تحرير الحقل (حسب النوع) ──────────────────────────────────────
function FieldEditor({
  state,
  onClose,
  onSave,
}: {
  state: EditorState;
  onClose: () => void;
  onSave: (val: unknown) => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">تحرير المحتوى</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        {state.type === "text" || state.type === "richtext" ? (
          <TextEditor value={String(state.value ?? "")} multiline={state.type === "richtext"} onSave={onSave} onClose={onClose} />
        ) : state.type === "image" ? (
          <ImageEditor value={String(state.value ?? "")} onSave={onSave} onClose={onClose} />
        ) : state.type === "link" ? (
          <LinkEditor value={state.value as { text: string; href: string }} onSave={onSave} onClose={onClose} />
        ) : (
          <ListEditor value={(state.value as ListItem[]) ?? []} fields={state.listFields ?? []} onSave={onSave} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

function Buttons({ onSave, onClose, disabled }: { onSave: () => void; onClose: () => void; disabled?: boolean }) {
  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={onSave} disabled={disabled} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        تطبيق
      </button>
      <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2 text-sm text-foreground hover:bg-muted">
        إلغاء
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function TextEditor({ value, multiline, onSave, onClose }: { value: string; multiline: boolean; onSave: (v: string) => void; onClose: () => void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      {multiline ? (
        <textarea value={v} onChange={(e) => setV(e.target.value)} rows={5} className={inputCls} autoFocus />
      ) : (
        <input value={v} onChange={(e) => setV(e.target.value)} className={inputCls} autoFocus />
      )}
      <Buttons onSave={() => onSave(v)} onClose={onClose} />
    </div>
  );
}

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("variant", "gallery");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({ ok: false }));
  return d.ok ? (d.url as string) : null;
}

function ImageEditor({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState(value);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const u = await uploadImage(file);
    setBusy(false);
    if (u) setUrl(u);
    else setErr("تعذّر الرفع.");
  };
  return (
    <div className="space-y-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="معاينة" className="max-h-48 w-full rounded-lg border border-border object-contain" />
      ) : null}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />} رفع صورة
        <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="أو ألصق رابط صورة" className={inputCls} />
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
      <Buttons onSave={() => onSave(url)} onClose={onClose} disabled={busy} />
    </div>
  );
}

function LinkEditor({ value, onSave, onClose }: { value: { text: string; href: string }; onSave: (v: { text: string; href: string }) => void; onClose: () => void }) {
  const [text, setText] = useState(value?.text ?? "");
  const [href, setHref] = useState(value?.href ?? "");
  return (
    <div className="space-y-3">
      <label className="block text-xs text-foreground">نصّ الزرّ<input value={text} onChange={(e) => setText(e.target.value)} className={cn(inputCls, "mt-1")} /></label>
      <label className="block text-xs text-foreground">الرابط<input value={href} onChange={(e) => setHref(e.target.value)} className={cn(inputCls, "mt-1")} placeholder="https://…" /></label>
      <Buttons onSave={() => onSave({ text, href })} onClose={onClose} />
    </div>
  );
}

function ListEditor({ value, fields, onSave, onClose }: { value: ListItem[]; fields: ListFieldDef[]; onSave: (v: ListItem[]) => void; onClose: () => void }) {
  const [items, setItems] = useState<ListItem[]>(value.length ? value : []);
  const upd = (i: number, k: string, val: string) => setItems((a) => a.map((it, idx) => (idx === i ? { ...it, [k]: val } : it)));
  const add = () => setItems((a) => [...a, Object.fromEntries(fields.map((f) => [f.key, ""]))]);
  const del = (i: number) => setItems((a) => a.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => setItems((a) => { const j = i + dir; if (j < 0 || j >= a.length) return a; const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const pickImg = async (i: number, k: string, file?: File) => { if (!file) return; const u = await uploadImage(file); if (u) upd(i, k, u); };

  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {items.map((it, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-border p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">عنصر {i + 1}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-muted"><ArrowUp className="size-3.5" /></button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-muted"><ArrowDown className="size-3.5" /></button>
                <button type="button" onClick={() => del(i)} className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
              </div>
            </div>
            {fields.map((f) =>
              f.type === "image" ? (
                <label key={f.key} className="flex items-center gap-2 text-[11px] text-foreground">
                  <span className="w-20 shrink-0">{f.label}</span>
                  <input type="file" accept="image/*" className="text-[11px]" onChange={(e) => pickImg(i, f.key, e.target.files?.[0])} />
                </label>
              ) : (
                <label key={f.key} className="flex items-center gap-2 text-[11px] text-foreground">
                  <span className="w-20 shrink-0">{f.label}</span>
                  <input value={it[f.key] ?? ""} onChange={(e) => upd(i, f.key, e.target.value)} className={cn(inputCls, "py-1")} />
                </label>
              ),
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted">
        <Plus className="size-3.5" /> إضافة عنصر
      </button>
      <Buttons onSave={() => onSave(items)} onClose={onClose} />
    </div>
  );
}
