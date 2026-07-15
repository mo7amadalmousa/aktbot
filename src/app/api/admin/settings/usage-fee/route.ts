import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMinUsageFees, setMinUsageFees, defaultMinUsageFee } from "@/lib/campaign/ugc";
import { sanitizeMinFeeMap } from "@/lib/campaign/ugc-input";
import { currencyList } from "@/lib/payments/money";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 }) };
  if (session.role !== "ADMIN")
    return { error: NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 }) };
  return { session };
}

// GET — الحدّ الأدنى المُخزَّن + الافتراضيّ لكل عملة (minor).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const stored = await getMinUsageFees();
  const defaults: Record<string, number> = {};
  for (const c of currencyList()) defaults[c.code] = defaultMinUsageFee(c.code);
  return NextResponse.json({ ok: true, fees: stored, defaults });
}

// PUT — ضبط الحدّ الأدنى per-currency ({ fees: { USD: major, ... } }).
export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  const raw = (body as { fees?: unknown })?.fees ?? body;
  const map = sanitizeMinFeeMap(raw);
  await setMinUsageFees(map);
  return NextResponse.json({ ok: true, fees: map });
}
