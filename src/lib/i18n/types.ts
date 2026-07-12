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

// خريطة النطاقات — أضِف `dashboard: DashboardMessages` لاحقاً دون كسر البنية.
export interface Messages {
  landing: LandingMessages;
}
