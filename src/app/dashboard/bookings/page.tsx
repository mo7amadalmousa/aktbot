import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BookingCancel } from "@/components/dashboard/booking-cancel";
import { releaseExpiredHolds } from "@/lib/booking/service";
import { formatFullInTz } from "@/lib/booking/time";
import { Clock, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "مؤكّد", cls: "bg-primary/10 text-primary" },
  PENDING: { label: "بانتظار الدفع", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  CANCELLED: { label: "أُلغي", cls: "bg-muted text-muted-foreground" },
  COMPLETED: { label: "منتهٍ", cls: "bg-muted text-muted-foreground" },
};

export default async function BookingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/bookings");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true, availability: { select: { timezone: true } } },
  });
  if (!profile) redirect("/dashboard");

  // حرّر المعلّقات المنتهية قبل العرض.
  await releaseExpiredHolds(profile.id);

  const tz = profile.availability?.timezone || "UTC";
  const bookings = await prisma.booking.findMany({
    where: { creatorProfileId: profile.id },
    orderBy: { startAt: "desc" },
    take: 200,
  });

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => b.startAt.getTime() >= now && b.status !== "CANCELLED",
  );
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <DashboardShell active="bookings" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-foreground">المواعيد</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              قادمة: <strong className="text-foreground">{upcoming.length}</strong> ·
              مؤكّدة: <strong className="text-primary">{confirmedCount}</strong>
            </span>
            <Link
              href="/dashboard/availability"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Settings className="size-4" /> إعدادات التوفّر
            </Link>
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            لا مواعيد بعد. فعّل بلوك استشارة وحدّد{" "}
            <Link href="/dashboard/availability" className="text-primary hover:underline">
              توفّرك
            </Link>
            .
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">العميل</th>
                  <th className="p-3 text-start font-medium">الموعد</th>
                  <th className="p-3 text-start font-medium">النوع</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                  <th className="p-3 text-start font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const s = STATUS[b.status] ?? {
                    label: b.status,
                    cls: "bg-muted text-muted-foreground",
                  };
                  const canCancel =
                    b.startAt.getTime() >= now &&
                    (b.status === "CONFIRMED" || b.status === "PENDING");
                  return (
                    <tr key={b.id} className="border-t border-border align-top">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{b.buyerName}</div>
                        <div className="text-xs text-muted-foreground">{b.buyerEmail}</div>
                      </td>
                      <td className="p-3 text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {formatFullInTz(b.startAt.toISOString(), tz)}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {b.meetingType === "online" ? "أونلاين" : "حضوريّ"}
                        {" · "}
                        {b.isPaid ? "مدفوع" : "مجانيّ"}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {canCancel ? <BookingCancel bookingId={b.id} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
