// ── أنواع الرسائل — نطاق واحد الآن (landing)، يُضاف dashboard لاحقاً بنفس النمط ──

export interface TitledItem {
  title: string;
  desc: string;
}

export interface LandingMessages {
  meta: { title: string; description: string; ogAlt: string };
  nav: {
    forCreators: string;
    forBrands: string;
    features: string;
    how: string;
    login: string;
    cta: string;
    themeLight: string;
    themeDark: string;
    language: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaCreator: string;
    ctaBrand: string;
    mockup: {
      name: string;
      bio: string;
      followers: string;
      link1: string;
      link1sub: string;
      link2: string;
      offerTitle: string;
      offerDesc: string;
    };
  };
  creators: { badge: string; title: string; subtitle: string; items: TitledItem[] };
  brands: { badge: string; title: string; subtitle: string; items: TitledItem[] };
  features: { title: string; subtitle: string; items: TitledItem[] };
  how: { title: string; subtitle: string; steps: TitledItem[] };
  stats: { disclaimer: string; items: { value: string; label: string }[] };
  finalCta: {
    title: string;
    subtitle: string;
    ctaCreator: string;
    ctaBrand: string;
  };
  footer: {
    tagline: string;
    productTitle: string;
    product: string[];
    companyTitle: string;
    company: string[];
    legalTitle: string;
    legal: string[];
    rights: string;
    placeholderNote: string;
  };
}

// ── نطاق الكونسول (لوحة الإشراف) ──────────────────────────────────────
export interface AdminMessages {
  brand: string;
  console: string; // "لوحة الإشراف"
  searchPlaceholder: string;
  logout: string;
  language: string;
  // الوضع — التسمية الإبداعية: داكن «قاع المحيط» · فاتح «سطح المحيط».
  theme: { toDark: string; toLight: string };
  nav: {
    groupMain: string;
    groupPeople: string;
    groupGrowth: string;
    groupFinance: string;
    groupSystem: string;
    overview: string;
    creators: string;
    brands: string;
    campaigns: string;
    commission: string;
    reports: string;
    settings: string;
    soon: string;
  };
  table: {
    search: string;
    empty: string;
    emptyDesc: string;
    prev: string;
    next: string;
    page: string;
    of: string;
    export: string;
  };
  overview: {
    title: string;
    desc: string;
    creators: string;
    published: string;
    visitors: string;
    unique: string;
    orders: string;
    paid: string;
    sales: string;
    salesSub: string;
    bookings: string;
    confirmed: string;
    trend: string;
    topCreators: string;
    recentCreators: string;
    noData: string;
    colCreator: string;
    colViews: string;
    colStatus: string;
    colDate: string;
    statusPublished: string;
    statusDraft: string;
  };
  commission: {
    title: string;
    desc: string;
    tx: string;
    totalCommission: string;
    totalSales: string;
    avg: string;
    bySource: string;
    trend: string;
    noTx: string;
    deferred: string;
  };
  campaigns: {
    title: string;
    desc: string;
    total: string;
    active: string;
    totalBudget: string;
    colTitle: string;
    colBrand: string;
    colType: string;
    colStatus: string;
    colBudget: string;
    colSpent: string;
    colParticipants: string;
    colSales: string;
  };
}

// خريطة النطاقات — أضِف `dashboard: DashboardMessages` لاحقاً دون كسر البنية.
export interface Messages {
  landing: LandingMessages;
  admin: AdminMessages;
}
