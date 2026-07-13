import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation";
import { parseConsultationConfig } from "@/lib/booking/service";
import { formatFullInTz } from "@/lib/booking/time";
import { CalendarCheck, Clock, XCircle, Video, MapPin, CalendarPlus } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "مؤكّد", cls: "text-primary" },
  PENDING: { label: "بانتظار الدفع", cls: "text-amber-600 dark:text-amber-400" },
  CANCELLED: { label: "أُلغي", cls: "text-destructive" },
  COMPLETED: { label: "منتهٍ", cls: "text-muted-foreground" },
};

export default async function BookingViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const email = normalizeEmail(one((await searchParams).e) ?? "");

  const b = email
    ? await prisma.booking.findUnique({
        where: { id },
        include: {
          creatorProfile: {
            select: {
              displayName: true,
              availability: { select: { timezone: true } },
            },
          },
        },
      })
    : null;

  const valid = b && normalizeEmail(b.buyerEmail) === email;

  if (!valid) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">تفاصيل الموعد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            لم نعثر على موعد مطابق. تأكّد من الرابط والبريد.
          </p>
        </div>
      </main>
    );
  }

  const tz = b.creatorProfile.availability?.timezone || "UTC";
  const block = await prisma.block.findUnique({
    where: { id: b.consultationBlockId },
    select: { config: true },
  });
  const cfg = block ? parseConsultationConfig(block.config) : null;
  const s = STATUS[b.status] ?? { label: b.status, cls: "text-muted-foreground" };
  const cancelled = b.status === "CANCELLED";
  const confirmed = b.status === "CONFIRMED";
  const icsHref = `/api/bookings/${b.id}/ics?e=${encodeURIComponent(b.buyerEmail)}`;

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div
          className={`mx-auto flex size-12 items-center justify-center rounded-full ${
            cancelled ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {cancelled ? (
            <XCircle className="size-6 text-destructive" />
          ) : confirmed ? (
            <CalendarCheck className="size-6 text-primary" />
          ) : (
            <Clock className="size-6 text-amber-500" />
          )}
        </div>

        <h1 className="mt-3 text-xl font-bold text-foreground">
          {cfg?.title || "استشارة"}
        </h1>
        <p className="text-sm text-muted-foreground">
          مع {b.creatorProfile.displayName}
        </p>
        <p className={`mt-1 text-sm font-semibold ${s.cls}`}>الحالة: {s.label}</p>

        <div className="mt-4 space-y-2 rounded-xl border border-border p-4 text-start text-sm">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-foreground">
              {formatFullInTz(b.startAt.toISOString(), tz)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {b.meetingType === "online" ? (
              <Video className="size-4 text-muted-foreground" />
            ) : (
              <MapPin className="size-4 text-muted-foreground" />
            )}
            <span className="text-foreground">
              {b.meetingType === "online" ? "لقاء أونلاين" : "لقاء حضوريّ"}
              {b.meetingLink && confirmed ? (
                <>
                  {" — "}
                  <a
                    href={b.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    رابط اللقاء
                  </a>
                </>
              ) : null}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {b.isPaid ? "مدفوع" : "مجانيّ"}
          </div>
        </div>

        {!cancelled ? (
          <a
            href={icsHref}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <CalendarPlus className="size-4" /> أضِفه لتقويمك (ICS)
          </a>
        ) : null}
      </div>
    </main>
  );
}
