// وسوم عرض (بلا أيّ اعتماد على prisma) — آمنة للاستيراد في مكوّنات العميل.
export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودّة",
  ACTIVE: "نشطة",
  PAUSED: "موقوفة",
  ENDED: "منتهية",
};
export const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  SALE: "مبيعات",
  PERFORMANCE: "أداء",
  UGC: "محتوى (UGC)",
};
export const PARTICIPATION_STATUS_LABEL: Record<string, string> = {
  INVITED: "مدعوّ",
  JOINED: "منضمّ",
  ACTIVE: "نشط",
  LEFT: "غادر",
};
