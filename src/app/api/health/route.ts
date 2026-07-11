import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ديناميكيّة دائماً — تُنفّذ عند الطلب لا وقت البناء.
export const dynamic = "force-dynamic";

export async function GET() {
  const time = new Date().toISOString();

  try {
    // اختبار اتصال فعليّ بقاعدة البيانات.
    await prisma.$queryRaw`SELECT 1`;
    const count = await prisma.healthCheck.count();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      records: count,
      time,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        db: "disconnected",
        error: error instanceof Error ? error.message : "unknown error",
        time,
      },
      { status: 503 },
    );
  }
}
