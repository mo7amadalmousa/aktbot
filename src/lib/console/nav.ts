import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Megaphone,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";
import type { AdminMessages } from "@/lib/i18n/types";

// ── خريطة تنقّل الكونسول (IA) — مجموعات منطقيّة جاهزة للنمو ──────────────
// إضافة صفحة أدمن لاحقاً = عنصر هنا (href + labelKey + enabled). الأقسام غير
// المبنية `enabled:false` تظهر معطّلة بوسم «قريباً». `roles` تمهيد لـRBAC (C7)
// — غير مُنفَّذ الآن (الحماية عبر proxy)، لكنه لا يُغلق الباب.

export interface NavItem {
  key: keyof AdminMessages["nav"];
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  roles?: string[]; // تمهيد RBAC — لا يُطبَّق الآن
}
export interface NavGroup {
  key: keyof AdminMessages["nav"];
  items: NavItem[];
}

export const CONSOLE_NAV: NavGroup[] = [
  {
    key: "groupMain",
    items: [{ key: "overview", href: "/admin", icon: LayoutDashboard, enabled: true }],
  },
  {
    key: "groupPeople",
    items: [
      { key: "creators", href: "/admin/creators", icon: Users, enabled: false },
      { key: "brands", href: "/admin/brands", icon: Building2, enabled: false },
    ],
  },
  {
    key: "groupGrowth",
    items: [
      { key: "campaigns", href: "/admin/campaigns", icon: Megaphone, enabled: false },
    ],
  },
  {
    key: "groupFinance",
    items: [{ key: "commission", href: "/admin/commission", icon: Wallet, enabled: true }],
  },
  {
    key: "groupSystem",
    items: [
      { key: "reports", href: "/admin/reports", icon: BarChart3, enabled: false },
      { key: "settings", href: "/admin/settings", icon: Settings, enabled: false },
    ],
  },
];

// المسار النشط: أطول href مطابق (كي لا يتطابق "/admin" مع كل شيء).
export function activeHref(pathname: string): string {
  let best = "";
  for (const g of CONSOLE_NAV) {
    for (const it of g.items) {
      if (!it.enabled) continue;
      const match = pathname === it.href || pathname.startsWith(`${it.href}/`);
      if (match && it.href.length > best.length) best = it.href;
    }
  }
  return best;
}
