import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  AvailabilityEditor,
  type AvailabilityInit,
} from "@/components/dashboard/availability-editor";
import { parseAvailability } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/availability");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { availability: true },
  });
  if (!profile) redirect("/dashboard");

  const init: AvailabilityInit | null = profile.availability
    ? (() => {
        const a = parseAvailability(profile.availability);
        return {
          timezone: a.timezone,
          slotMinutes: a.slotMinutes,
          bufferMinutes: a.bufferMinutes,
          horizonDays: a.horizonDays,
          weekly: a.weekly,
          exceptions: a.exceptions,
        };
      })()
    : null;

  return (
    <DashboardShell active="bookings" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <AvailabilityEditor initial={init} />
      </div>
    </DashboardShell>
  );
}
