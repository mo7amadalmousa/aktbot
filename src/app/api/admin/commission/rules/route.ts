import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { sanitizeRule, RuleError } from "@/lib/commission/rule-input";
import type { CommissionScope, SaleType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ ok: false, error: "غير مصادق." }, { status: 401 }) };
  if (session.role !== "ADMIN")
    return { error: NextResponse.json({ ok: false, error: "غير مصرّح." }, { status: 403 }) };
  return { session };
}

// GET — كلّ قواعد العمولة (admin).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const rules = await prisma.commissionRule.findMany({
    orderBy: [{ scope: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, rules });
}

// POST — إنشاء قاعدة.
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "طلب غير صالح." }, { status: 400 });
  }
  let clean;
  try {
    clean = sanitizeRule(body);
  } catch (e) {
    if (e instanceof RuleError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 422 });
    }
    throw e;
  }

  const rule = await prisma.commissionRule.create({
    data: {
      scope: clean.scope as CommissionScope,
      targetId: clean.targetId,
      saleType: clean.saleType as SaleType | null,
      percentBps: clean.percentBps,
      fixedAmount: clean.fixedAmount,
      priority: clean.priority,
      startAt: clean.startAt,
      endAt: clean.endAt,
      isActive: clean.isActive,
      label: clean.label,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: rule.id });
}
