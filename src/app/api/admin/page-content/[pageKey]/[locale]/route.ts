import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { saveDraft, publishDraft, discardDraft } from "@/lib/cms/content";
import { isLocale } from "@/lib/i18n/config";
import type { Overrides } from "@/lib/cms/fields";

export const runtime = "nodejs";

const PAGE_KEY_RE = /^[a-z0-9-]{2,40}$/;
const MAX_KEYS = 400;
const MAX_STR = 5000;

// تنقية خريطة التجاوزات: مفاتيح مسطّحة · قيَم string|boolean|مصفوفة كائنات مسطّحة.
function sanitizeOverrides(raw: unknown): Overrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Overrides = {};
  let n = 0;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (n >= MAX_KEYS) break;
    if (typeof k !== "string" || k.length > 80) continue;
    if (typeof v === "string") out[k] = v.slice(0, MAX_STR);
    else if (typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v)) {
      out[k] = v.slice(0, 40).map((item) => {
        const o: Record<string, string> = {};
        if (item && typeof item === "object" && !Array.isArray(item)) {
          for (const [ik, iv] of Object.entries(item as Record<string, unknown>)) {
            if (typeof ik === "string" && typeof iv === "string") o[ik.slice(0, 60)] = iv.slice(0, MAX_STR);
          }
        }
        return o;
      });
    }
    n++;
  }
  return out;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageKey: string; locale: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 });

  const { pageKey, locale } = await params;
  if (!PAGE_KEY_RE.test(pageKey) || !isLocale(locale)) {
    return NextResponse.json({ ok: false, error: "صفحة/لغة غير صالحة." }, { status: 422 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const action = String((body as { action?: unknown })?.action ?? "save");
  const overrides = sanitizeOverrides((body as { overrides?: unknown })?.overrides);

  if (action === "publish") {
    await publishDraft(pageKey, locale, overrides, session.sub);
  } else if (action === "discard") {
    await discardDraft(pageKey, locale);
  } else {
    await saveDraft(pageKey, locale, overrides, session.sub);
  }
  return NextResponse.json({ ok: true });
}
