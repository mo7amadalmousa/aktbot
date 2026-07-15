// ── حلّ حقول المحتوى (overlay) — آمن للعميل (بلا prisma) ───────────────
// القيَم الافتراضيّة من i18n؛ التجاوزات من CMS تعلوها. مفاتيح مسطّحة "sec.field".

export type Overrides = Record<string, unknown>;

export function fieldText(o: Overrides, key: string, def: string): string {
  const v = o[key];
  return typeof v === "string" && v.trim() !== "" ? v : def;
}

export function fieldUrl(o: Overrides, key: string, def: string): string {
  const v = o[key];
  return typeof v === "string" && v.trim() !== "" ? v : def;
}

// إظهار/إخفاء سكشن: مفتاح "visible.<id>" — مخفيّ فقط إذا القيمة false صراحةً.
export function sectionVisible(o: Overrides, id: string): boolean {
  return o[`visible.${id}`] !== false;
}

export interface ListItem {
  [k: string]: string;
}

export function fieldList(o: Overrides, key: string, def: ListItem[]): ListItem[] {
  const v = o[key];
  if (Array.isArray(v)) {
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const out: ListItem = {};
        for (const [k, val] of Object.entries(x as Record<string, unknown>)) {
          if (typeof val === "string") out[k] = val;
        }
        return out;
      });
  }
  return def;
}

export type FieldType = "text" | "richtext" | "image" | "link" | "list";
