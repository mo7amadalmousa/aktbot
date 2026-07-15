import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCreatorParticipations } from "@/lib/attribution/query";
import { getCreatorUgcData } from "@/lib/campaign/ugc-query";
import { CopyBtn } from "@/components/brand/brand-actions";
import { fmtNum } from "@/components/dashboard/analytics-bits";
import { formatMoney } from "@/lib/payments/money";
import { PARTICIPATION_STATUS_LABEL } from "@/lib/attribution/query";
import { ParticipationAccept } from "@/components/dashboard/participation-accept";
import { UgcCreatorPanel } from "@/components/dashboard/ugc-creator-panel";

export const dynamic = "force-dynamic";

function linkBase(): string {
  return (
    process.env.NEXT_PUBLIC_LINK_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    ""
  );
}

export default async function CreatorCampaignsPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/campaigns");

  // ملكية: مشاركات ملف هذا المستخدم فقط (session.sub).
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });
  if (!profile) redirect("/dashboard");

  const [parts, ugc] = await Promise.all([
    getCreatorParticipations(profile.id),
    getCreatorUgcData(profile.id),
  ]);
  const base = linkBase();

  return (
    <DashboardShell active="campaigns" email={session.email}>
      <div className="flex flex-1 flex-col p-5">
        <h1 className="mb-4 text-lg font-bold text-foreground">حملاتي</h1>

        {parts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            لم تُدعَ لأيّ حملة بعد. حين تنضمّ لحملة علامة، يظهر كودك ورابطك الفريدان هنا.
          </div>
        ) : (
          <div className="space-y-3">
            {parts.map((p) => {
              const invited = p.status === "INVITED";
              const meta = ugc.metaByCampaign[p.campaignId];
              const subs = ugc.submissionsByParticipation[p.id] ?? [];
              const isUgc = meta?.type === "UGC";
              return (
                <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-foreground">{p.campaignTitle}</h2>
                      <p className="text-xs text-muted-foreground">{p.brandName}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        invited ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {PARTICIPATION_STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>

                  {invited ? (
                    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                      <span className="text-sm text-foreground">
                        دعتك «{p.brandName}» للانضمام — اقبل لتفعيل رابطك وبدء احتساب مستحقّاتك.
                      </span>
                      <ParticipationAccept participationId={p.id} />
                      {isUgc && meta ? (
                        <div className="w-full border-t border-amber-500/20 pt-2 text-xs text-muted-foreground">
                          <p>
                            شروط قبل القبول:{" "}
                            {meta.contentFee != null ? (
                              <>
                                أجر كل محتوى مقبول{" "}
                                <strong className="text-foreground">{formatMoney(meta.contentFee, meta.currency)}</strong>.{" "}
                              </>
                            ) : null}
                            {meta.usageRightsWanted
                              ? "قد تُطلب حقوق استخدام بأجر منفصل يُتّفق عند الطلب."
                              : "لا حقوق استخدام مطلوبة."}
                          </p>
                          {meta.brief ? <p className="mt-1">البريف: {meta.brief}</p> : null}
                          {meta.requirements.length > 0 ? (
                            <ul className="mt-1 list-inside list-disc">
                              {meta.requirements.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        كودي: <strong className="font-mono text-foreground">{p.code}</strong>
                      </span>
                      <CopyBtn text={p.code} label="نسخ الكود" />
                      <CopyBtn text={`${base}${p.link}`} label="نسخ الرابط" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
                    {[
                      { l: "نقرات", v: fmtNum(p.clicks) },
                      { l: "تحويلات", v: fmtNum(p.conversions) },
                      { l: "مبيعات", v: fmtNum(p.sales) },
                      { l: "قيمة مبيعاتي", v: formatMoney(p.salesValue, p.currency) },
                      { l: "مستحقّي", v: formatMoney(p.payoutAccrued, p.currency) },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg border border-border p-2">
                        <div className="text-sm font-bold text-foreground">{s.v}</div>
                        <div className="text-[10px] text-muted-foreground">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* لوحة UGC للمشاركة النشطة: تسليم + مراجعة + حقوق */}
                  {isUgc && !invited ? (
                    <UgcCreatorPanel campaignId={p.campaignId} meta={meta} submissions={subs} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          شارك رابطك أو كودك — كل نقرة/بيع يُسنَد إليك ويُحتسب في عمولتك.
        </p>
      </div>
    </DashboardShell>
  );
}
