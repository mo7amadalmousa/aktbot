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
  "BEFORE_AFTER",
  "STORY",
  "SOCIAL",
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
  CONSULTATION: { label: "استشارة مدفوعة", hint: "حجز جلسة بسعر", addable: true },
  PAID_VIDEO: { label: "فيديو خاص مدفوع", hint: "طلب فيديو بسعر", addable: true },
  STORE: { label: "متجر", hint: "منتجات بروابط شراء", addable: true },
  NEWSLETTER: { label: "نشرة بريدية", hint: "جمع اشتراكات بالبريد", addable: true },
  QR: { label: "رمز QR", hint: "رمز صفحتك للمشاركة", addable: true },
  BEFORE_AFTER: { label: "قبل / بعد", hint: "سلايدر مقارنة صورتين", addable: true },
  STORY: { label: "ستوري", hint: "نشر مؤقّت (24 ساعة أو مشاهدة واحدة)", addable: true },
  SOCIAL: { label: "تواصل اجتماعي", hint: "أيقونات روابط منصّاتك", addable: true },
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
    case "CONSULTATION":
      return {
        title: "استشارة خاصّة",
        description: "",
        duration: "٣٠ دقيقة",
        price: 50,
        currency: "USD",
      };
    case "PAID_VIDEO":
      return {
        title: "فيديو خاص",
        description: "",
        price: 30,
        currency: "USD",
      };
    case "BEFORE_AFTER":
      return {
        beforeUrl: "",
        afterUrl: "",
        beforeLabel: "قبل",
        afterLabel: "بعد",
        orientation: "horizontal",
      };
    case "STORY":
      return {
        title: "ستوري",
        mode: "TIME_24H",
        publishedAt: Date.now(),
        media: [],
      };
    case "STORE":
      return { title: "متجري المختار", products: [] };
    case "NEWSLETTER":
      return {
        title: "اشترك في نشرتي",
        description: "نصائح ومحتوى حصريّ في بريدك.",
        buttonLabel: "اشتراك",
      };
    case "QR":
      return { title: "رمز صفحتي" };
    case "SOCIAL":
      return { links: [{ platform: "instagram", url: "" }] };
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
