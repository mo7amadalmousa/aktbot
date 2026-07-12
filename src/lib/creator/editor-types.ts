import type { BlockType } from "@/generated/prisma/enums";

// قائمة الأنواع (نصّية — تُبقي عميل Prisma خارج حزمة العميل).
export const ALL_BLOCK_TYPES = [
  "LINK",
  "EMBED",
  "GALLERY",
  "FORM",
  "CONSULTATION",
  "PAID_VIDEO",
  "STORE",
  "NEWSLETTER",
  "QR",
] as const;

// وصف كل نوع للمحرّر. addable=false → «قريباً» (لا يُضاف؛ الموجود يُرتَّب/يُخفى/يُحذف).
export const BLOCK_META: Record<
  string,
  { label: string; hint: string; addable: boolean }
> = {
  LINK: { label: "رابط", hint: "زرّ يوجّه لأي رابط", addable: true },
  EMBED: { label: "فيديو / تضمين", hint: "YouTube · TikTok · Reels · Vimeo", addable: true },
  GALLERY: { label: "معرض صور", hint: "شبكة صور (قبل/بعد)", addable: true },
  FORM: { label: "نموذج تواصل", hint: "حقول تواصل", addable: true },
  CONSULTATION: { label: "استشارة", hint: "بطاقة + سعر (يحتاج الدفع)", addable: false },
  PAID_VIDEO: { label: "فيديو مدفوع", hint: "بطاقة + سعر (يحتاج الدفع)", addable: false },
  STORE: { label: "متجر", hint: "قريباً", addable: false },
  NEWSLETTER: { label: "نشرة بريدية", hint: "قريباً", addable: false },
  QR: { label: "رمز QR", hint: "قريباً", addable: false },
};

// config افتراضيّ عند إضافة بلوك جديد.
export function defaultBlockConfig(type: string): Record<string, unknown> {
  switch (type) {
    case "LINK":
      return { label: "رابط جديد", url: "", subtitle: "" };
    case "EMBED":
      return { url: "", title: "" };
    case "GALLERY":
      return { title: "", images: [] };
    case "FORM":
      return {
        title: "تواصل معي",
        submitLabel: "إرسال",
        fields: [
          { label: "الاسم", type: "text", placeholder: "" },
          { label: "البريد الإلكتروني", type: "email", placeholder: "" },
        ],
      };
    default:
      return { title: "" };
  }
}

// شكل بلوك في حالة المحرّر (client).
export interface EditorBlock {
  key: string; // مفتاح محليّ مستقرّ (React)
  id?: string; // معرّف القاعدة (إن كان محفوظاً)
  type: BlockType | string;
  config: Record<string, unknown>;
  visibility: boolean;
}

export interface EditorProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  username: string;
  isPublished: boolean;
  isVerified: boolean;
  followerCount: number;
  socialLinks: Record<string, string>;
  language: string;
  direction: string;
}

export interface EditorInitial {
  profile: EditorProfile;
  themeId: string;
  background: Record<string, unknown>;
  blocks: EditorBlock[];
}
