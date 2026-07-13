import { prisma } from "@/lib/prisma";
import { asRecord, str, num, arr } from "@/lib/public/block-config";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import {
  getPaymentProvider,
  toMinor,
  isSupportedCurrency,
} from "@/lib/payments";
import {
  sendBookingConfirmationBuyer,
  sendBookingConfirmationCreator,
  sendBookingCancellation,
} from "@/lib/email";
import {
  generateSlots,
  type AvailabilityShape,
  type WeeklyDay,
} from "@/lib/booking/time";

export class BookingError extends Error {}

// مهلة حجز المدفوع (hold) — يُحرَّر الموعد إن لم يُدفع خلالها.
export const HOLD_MINUTES = 15;

const DEFAULT_AVAILABILITY: AvailabilityShape = {
  timezone: "UTC",
  slotMinutes: 30,
  bufferMinutes: 0,
  horizonDays: 30,
  weekly: [],
  exceptions: [],
};

// يحوّل صفّ التوفّر إلى شكل موحّد بقيَم افتراضيّة آمنة.
export function parseAvailability(row: unknown): AvailabilityShape {
  const r = asRecord(row);
  const weekly = arr(r.weekly)
    .map((w): WeeklyDay | null => {
      const wr = asRecord(w);
      const day = num(wr.day);
      if (day === null || day < 0 || day > 6) return null;
      const ranges = arr(wr.ranges)
        .map((x) => {
          const xr = asRecord(x);
          return { start: str(xr.start), end: str(xr.end) };
        })
        .filter((x) => x.start && x.end);
      return { day, ranges };
    })
    .filter((x): x is WeeklyDay => x !== null);
  const exceptions = arr(r.exceptions)
    .map((x) => str(x))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  return {
    timezone: str(r.timezone) || "UTC",
    slotMinutes: num(r.slotMinutes) ?? 30,
    bufferMinutes: num(r.bufferMinutes) ?? 0,
    horizonDays: num(r.horizonDays) ?? 30,
    weekly,
    exceptions,
  };
}

// إعدادات بلوك الاستشارة (mode/price/meeting…).
export interface ConsultationConfig {
  mode: "FREE" | "PAID";
  title: string;
  description: string;
  price: number; // major (0 للمجانيّ)
  currency: string;
  meetingType: "online" | "in_person";
  instructions: string;
  meetingLink: string;
}

export function parseConsultationConfig(config: unknown): ConsultationConfig {
  const c = asRecord(config);
  const mode = str(c.mode) === "PAID" ? "PAID" : "FREE";
  const currency = str(c.currency) || "USD";
  return {
    mode,
    title: str(c.title) || "استشارة",
    description: str(c.description),
    price: num(c.price) ?? 0,
    currency: isSupportedCurrency(currency) ? currency : "USD",
    meetingType: str(c.meetingType) === "in_person" ? "in_person" : "online",
    instructions: str(c.instructions),
    meetingLink: str(c.meetingLink),
  };
}

// يحمّل بلوك استشارة قابلاً للحجز + توفّر المبدع.
export async function loadBookableConsultation(blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: {
      page: {
        include: {
          creatorProfile: {
            select: {
              id: true,
              displayName: true,
              isPublished: true,
              username: true,
              availability: true,
            },
          },
        },
      },
    },
  });
  if (
    !block ||
    !block.visibility ||
    block.type !== "CONSULTATION" ||
    !block.page?.creatorProfile?.isPublished
  ) {
    return null;
  }
  const creatorProfile = block.page.creatorProfile;
  const config = parseConsultationConfig(block.config);
  const availability = creatorProfile.availability
    ? parseAvailability(creatorProfile.availability)
    : null;
  return { block, creatorProfile, config, availability };
}

// يحرّر المواعيد المدفوعة المعلّقة التي انتهت مهلتها (lazy GC — بلا cron الآن).
export async function releaseExpiredHolds(creatorProfileId?: string) {
  await prisma.booking.updateMany({
    where: {
      status: "PENDING",
      holdExpiresAt: { lt: new Date() },
      ...(creatorProfileId ? { creatorProfileId } : {}),
    },
    data: { status: "CANCELLED", slotKey: null },
  });
}

// المواعيد النشطة (CONFIRMED أو hold ساري) لبلوك — لاستبعادها من الشاغر.
async function busyStartSet(
  creatorProfileId: string,
  from: Date,
): Promise<Set<string>> {
  const rows = await prisma.booking.findMany({
    where: {
      creatorProfileId,
      startAt: { gte: from },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", holdExpiresAt: { gt: new Date() } },
      ],
    },
    select: { startAt: true },
  });
  return new Set(rows.map((r) => r.startAt.toISOString()));
}

// المواعيد الشاغرة لبلوك استشارة (بعد تحرير المعلّقات المنتهية).
export async function getAvailableSlots(blockId: string) {
  const loaded = await loadBookableConsultation(blockId);
  if (!loaded || !loaded.availability) return null;
  await releaseExpiredHolds(loaded.creatorProfile.id);
  const now = new Date();
  const busy = await busyStartSet(loaded.creatorProfile.id, now);
  const grid = generateSlots(loaded.availability, busy, now);
  return { loaded, grid };
}

interface BookingInput {
  blockId: string;
  buyerName: string;
  buyerEmail: string;
  startISO: string;
}

function cleanBuyer(name: string, email: string) {
  const buyerName = name.trim().slice(0, 120);
  const buyerEmail = normalizeEmail(email);
  if (!buyerName) throw new BookingError("الاسم مطلوب.");
  if (!isValidEmail(buyerEmail)) throw new BookingError("بريد إلكترونيّ غير صالح.");
  return { buyerName, buyerEmail };
}

// يتحقّق أنّ الموعد المطلوب ضمن الشاغر فعلاً (توفّر · ليس ماضياً · غير محجوز · محاذاة).
async function resolveSlot(blockId: string, startISO: string) {
  const res = await getAvailableSlots(blockId);
  if (!res) throw new BookingError("الحجز غير متاح لهذا العنصر.");
  const all = res.grid.days.flatMap((d) => d.slots);
  const slot = all.find((s) => s.startISO === startISO);
  if (!slot) throw new BookingError("الموعد لم يعد متاحاً، اختر موعداً آخر.");
  return { ...res.loaded, slot };
}

function slotKeyOf(creatorProfileId: string, startISO: string) {
  return `${creatorProfileId}|${startISO}`;
}

// خطأ تصادم القيد الفريد (حجز متزامن لنفس الفترة).
function isUniqueViolation(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && (e as { code?: string }).code === "P2002");
}

// حجز مجانيّ — تأكيد مباشر (CONFIRMED) ذرّيّاً + بريد الطرفين.
export async function createFreeBooking(input: BookingInput) {
  const { buyerName, buyerEmail } = cleanBuyer(input.buyerName, input.buyerEmail);
  const r = await resolveSlot(input.blockId, input.startISO);
  if (r.config.mode !== "FREE") {
    throw new BookingError("هذه الاستشارة مدفوعة.");
  }

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        creatorProfileId: r.creatorProfile.id,
        consultationBlockId: r.block.id,
        buyerName,
        buyerEmail,
        startAt: new Date(r.slot.startISO),
        endAt: new Date(r.slot.endISO),
        status: "CONFIRMED",
        isPaid: false,
        meetingType: r.config.meetingType,
        meetingLink: r.config.meetingType === "online" ? r.config.meetingLink || null : null,
        slotKey: slotKeyOf(r.creatorProfile.id, r.slot.startISO), // منع الازدواج الذرّيّ
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new BookingError("سُبِقتَ إلى هذا الموعد للتوّ، اختر غيره.");
    }
    throw e;
  }

  await notifyBookingConfirmed(booking.id);
  return booking;
}

// حجز مدفوع — hold (PENDING) ذرّيّ + Order + بدء الدفع. التأكيد عند نجاح الدفع.
export async function createPaidBookingOrder(input: BookingInput) {
  const { buyerName, buyerEmail } = cleanBuyer(input.buyerName, input.buyerEmail);
  const r = await resolveSlot(input.blockId, input.startISO);
  if (r.config.mode !== "PAID") {
    throw new BookingError("هذه الاستشارة مجانيّة — تُحجَز مباشرةً.");
  }
  if (r.config.price <= 0) {
    throw new BookingError("سعر الاستشارة غير صالح.");
  }
  const amountMinor = toMinor(r.config.price, r.config.currency); // من القاعدة

  // 1) احجز الموعد كـhold ذرّيّاً (يمنع الازدواج قبل الدفع).
  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        creatorProfileId: r.creatorProfile.id,
        consultationBlockId: r.block.id,
        buyerName,
        buyerEmail,
        startAt: new Date(r.slot.startISO),
        endAt: new Date(r.slot.endISO),
        status: "PENDING",
        isPaid: false,
        meetingType: r.config.meetingType,
        holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60000),
        slotKey: slotKeyOf(r.creatorProfile.id, r.slot.startISO),
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new BookingError("سُبِقتَ إلى هذا الموعد للتوّ، اختر غيره.");
    }
    throw e;
  }

  // 2) أنشئ الطلب وابدأ الدفع (السعر من القاعدة).
  const order = await prisma.order.create({
    data: {
      creatorProfileId: r.creatorProfile.id,
      buyerName,
      buyerEmail,
      blockType: "CONSULTATION",
      blockId: r.block.id,
      amount: amountMinor,
      currency: r.config.currency,
      status: "PENDING",
      provider: getPaymentProvider().id,
      metadata: { title: r.config.title, kind: "booking", bookingId: booking.id },
    },
    select: { id: true },
  });

  const provider = getPaymentProvider();
  const payment = await provider.createPayment({
    orderId: order.id,
    amount: amountMinor,
    currency: r.config.currency,
    description: r.config.title,
    buyerEmail,
  });

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { providerRef: payment.providerRef },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { orderId: order.id },
    }),
  ]);

  return { orderId: order.id, bookingId: booking.id, checkoutUrl: payment.checkoutUrl };
}

// تأكيد حجز مدفوع بعد نجاح الدفع (يُستدعى من webhook الدفع) — idempotent.
export async function confirmBookingByOrder(orderId: string) {
  const booking = await prisma.booking.findUnique({ where: { orderId } });
  if (!booking || booking.status === "CONFIRMED") return;

  // اربط رابط اللقاء من إعدادات البلوك وقت التأكيد.
  const block = await prisma.block.findUnique({
    where: { id: booking.consultationBlockId },
    select: { config: true },
  });
  const cfg = block ? parseConsultationConfig(block.config) : null;

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CONFIRMED",
      isPaid: true,
      // أعد ضبط slotKey (قد يكون hold ما زال يملكه) — يبقى مشغولاً.
      slotKey: slotKeyOf(booking.creatorProfileId, booking.startAt.toISOString()),
      meetingLink:
        cfg && cfg.meetingType === "online" ? cfg.meetingLink || null : booking.meetingLink,
    },
  });
  await notifyBookingConfirmed(booking.id);
}

// بريد التأكيد للطرفين.
async function notifyBookingConfirmed(bookingId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      creatorProfile: {
        select: {
          displayName: true,
          availability: { select: { timezone: true } },
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!b) return;
  const tz = b.creatorProfile.availability?.timezone || "UTC";
  const data = {
    bookingId: b.id,
    buyerName: b.buyerName,
    buyerEmail: b.buyerEmail,
    creatorName: b.creatorProfile.displayName,
    startISO: b.startAt.toISOString(),
    endISO: b.endAt.toISOString(),
    timezone: tz,
    isPaid: b.isPaid,
    meetingType: b.meetingType,
    meetingLink: b.meetingLink,
  };
  await sendBookingConfirmationBuyer(data);
  const creatorEmail = b.creatorProfile.user?.email;
  if (creatorEmail) await sendBookingConfirmationCreator(creatorEmail, data);
}

// إلغاء حجز — يحرّر الموعد + بريد. byCreator=true للإلغاء من الداشبورد.
export async function cancelBooking(bookingId: string) {
  const b = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      creatorProfile: {
        select: {
          displayName: true,
          availability: { select: { timezone: true } },
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!b || b.status === "CANCELLED") return b;

  await prisma.booking.update({
    where: { id: b.id },
    data: { status: "CANCELLED", slotKey: null }, // يحرّر الموعد
  });

  const tz = b.creatorProfile.availability?.timezone || "UTC";
  await sendBookingCancellation({
    buyerName: b.buyerName,
    buyerEmail: b.buyerEmail,
    creatorName: b.creatorProfile.displayName,
    creatorEmail: b.creatorProfile.user?.email ?? null,
    startISO: b.startAt.toISOString(),
    timezone: tz,
    isPaid: b.isPaid,
  });
  return b;
}
