import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadPurchasableProduct, PRODUCT_TYPE_LABEL } from "@/lib/payments/service";
import { formatMoney } from "@/lib/payments/money";
import { arr, str } from "@/lib/public/block-config";
import { safeHref } from "@/lib/public/safe-url";
import { ResponsiveImage } from "@/components/public/responsive-image";
import { Download, GraduationCap, Package } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

const shipField =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export default async function StoreProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<SP>;
}) {
  const { productId } = await params;
  const sp = await searchParams;
  const error = one(sp.error);

  const item = await loadPurchasableProduct(productId);
  if (!item) notFound();

  const type = item.product.type;
  const isPhysical = type === "PHYSICAL";
  const isCourse = type === "COURSE";
  const priceLabel = formatMoney(item.productPrice, item.currency);
  const shipLabel =
    item.shippingFee > 0 ? formatMoney(item.shippingFee, item.currency) : null;
  const totalLabel = formatMoney(item.amountMinor, item.currency);
  const firstImage = safeHref(arr(item.product.images).map((u) => str(u))[0]);

  // معاينة منهج الكورس (عناوين الوحدات/عدد الدروس) — قراءة فقط.
  const outline = isCourse
    ? await prisma.courseModule.findMany({
        where: { productId },
        orderBy: { order: "asc" },
        select: { id: true, title: true, _count: { select: { lessons: true } } },
      })
    : [];
  const lessonTotal = outline.reduce((n, m) => n + m._count.lessons, 0);

  const TypeIcon = isCourse ? GraduationCap : isPhysical ? Package : Download;
  const afterNote = isCourse
    ? "بعد الدفع يصلك رابط وصول خاصّ لمحتوى الكورس."
    : isPhysical
      ? "بعد الدفع يُجهّز المبدع طلبك ويشحنه، وتتابع الحالة برابط خاصّ."
      : "بعد الدفع تصلك رسالة بريد فيها رابط تحميل خاصّ وآمن.";

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <span className="flex mx-auto size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            A
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {firstImage ? (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <ResponsiveImage
                url={firstImage}
                variant="gallery"
                alt={item.title}
                className="size-full object-cover"
              />
            </div>
          ) : null}

          <div className="p-6">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <TypeIcon className="size-3.5" /> {PRODUCT_TYPE_LABEL[type]}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {item.creatorProfile.displayName}
            </p>
            <h1 className="mt-1 text-xl font-bold text-foreground">
              {item.title}
            </h1>
            {item.description ? (
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}

            {/* منهج الكورس */}
            {isCourse && outline.length > 0 ? (
              <div className="mt-3 rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-semibold text-foreground">
                  المنهج · {outline.length} وحدات · {lessonTotal} دروس
                </p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  {outline.map((m, i) => (
                    <li key={m.id} className="flex justify-between gap-2">
                      <span>
                        {i + 1}. {m.title}
                      </span>
                      <span className="shrink-0 text-xs">
                        {m._count.lessons} دروس
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {/* السعر (مع تفصيل الشحن للفيزيائيّ) */}
            <div className="mt-3">
              {isPhysical && shipLabel ? (
                <div className="mb-1 space-y-0.5 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>السعر</span>
                    <span>{priceLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الشحن</span>
                    <span>{shipLabel}</span>
                  </div>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  {isPhysical && shipLabel ? "الإجمالي" : "السعر"}
                </span>
                <span className="text-2xl font-extrabold text-primary">
                  {totalLabel}
                </span>
              </div>
              {isPhysical && item.product.stock !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  المتبقّي في المخزون: {item.product.stock}
                </p>
              ) : null}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">{afterNote}</p>

            {error ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form
              method="post"
              action="/api/pay/product-checkout"
              className="mt-5 space-y-3"
            >
              <input type="hidden" name="productId" value={item.product.id} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  الاسم
                </span>
                <input name="buyerName" required className={shipField} placeholder="اسمك" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  البريد الإلكتروني{" "}
                  {isCourse
                    ? "(سيصلك عليه رابط الوصول)"
                    : isPhysical
                      ? "(للتأكيد والمتابعة)"
                      : "(سيصلك عليه رابط التحميل)"}
                </span>
                <input
                  name="buyerEmail"
                  type="email"
                  required
                  className={shipField}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground">
                  كود إحالة (اختياريّ)
                </span>
                <input
                  name="attrCode"
                  defaultValue={one(sp.code) ?? ""}
                  className={shipField}
                  placeholder="ادخل الكود إن وُجد"
                />
              </label>

              {/* عنوان الشحن — الفيزيائيّ فقط */}
              {isPhysical ? (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold text-foreground">
                    عنوان الشحن
                  </p>
                  <input name="ship_fullName" required className={shipField} placeholder="اسم المستلم" />
                  <input name="ship_phone" required className={shipField} placeholder="رقم الهاتف" />
                  <div className="flex gap-2">
                    <input name="ship_country" required className={shipField} placeholder="الدولة" />
                    <input name="ship_city" required className={shipField} placeholder="المدينة" />
                  </div>
                  <input name="ship_line" required className={shipField} placeholder="العنوان التفصيليّ" />
                  <input name="ship_postalCode" className={shipField} placeholder="الرمز البريديّ (اختياريّ)" />
                </div>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isCourse
                  ? "الشراء والوصول"
                  : isPhysical
                    ? "الشراء والشحن"
                    : "الشراء والتحميل"}{" "}
                — {totalLabel}
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              دفع تجريبيّ (mock) — لن يُخصَم أيّ مبلغ حقيقيّ.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
