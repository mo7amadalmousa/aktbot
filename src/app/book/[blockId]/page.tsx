import { notFound } from "next/navigation";
import {
  loadBookableConsultation,
  getAvailableSlots,
} from "@/lib/booking/service";
import { formatMoney, toMinor } from "@/lib/payments/money";
import { BookingWidget } from "@/components/public/booking-widget";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ blockId: string }>;
  searchParams: Promise<SP>;
}) {
  const { blockId } = await params;
  const sp = await searchParams;
  const error = one(sp.error);

  const loaded = await loadBookableConsultation(blockId);
  if (!loaded) notFound();

  const { config, creatorProfile, availability } = loaded;
  const priceLabel =
    config.mode === "PAID" && config.price > 0
      ? formatMoney(toMinor(config.price, config.currency), config.currency)
      : null;

  const grid =
    availability && availability.weekly.length
      ? (await getAvailableSlots(blockId))?.grid ?? null
      : null;

  return (
    <main className="flex flex-1 items-start justify-center bg-muted/30 p-6">
      <div className="w-full max-w-lg">
        <div className="mb-4 text-center">
          <span className="flex mx-auto size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </span>
        </div>

        <div className="mb-4 text-center">
          <p className="text-xs text-muted-foreground">
            حجز موعد · {creatorProfile.displayName}
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{config.title}</h1>
          {config.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {config.description}
            </p>
          ) : null}
          {config.instructions ? (
            <p className="mx-auto mt-2 max-w-md rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              {config.instructions}
            </p>
          ) : null}
        </div>

        {!availability || !availability.weekly.length ? (
          <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            لم يحدّد المبدع مواعيده بعد.
          </div>
        ) : (
          <BookingWidget
            blockId={blockId}
            mode={config.mode}
            priceLabel={priceLabel}
            meetingType={config.meetingType}
            timezone={grid?.timezone ?? availability.timezone}
            days={grid?.days ?? []}
            error={error}
          />
        )}
      </div>
    </main>
  );
}
