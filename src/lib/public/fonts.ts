import {
  Tajawal,
  Cairo,
  Almarai,
  Rubik,
  Poppins,
  Playfair_Display,
} from "next/font/google";

// خطوط الصفحة العامّة (تُطبَّق على غلاف الصفحة فقط — لا هوية المنصّة).
// المتصفّح ينزّل الخطّ المُطبَّق فقط (className على الغلاف).

const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], display: "swap" });
const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "600", "700"], display: "swap" });
const almarai = Almarai({ subsets: ["arabic"], weight: ["400", "700"], display: "swap" });
const rubik = Rubik({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "700"], display: "swap" });

interface FontDef {
  id: string;
  label: string;
  className: string;
}

export const FONTS: FontDef[] = [
  { id: "tajawal", label: "Tajawal", className: tajawal.className },
  { id: "cairo", label: "Cairo", className: cairo.className },
  { id: "almarai", label: "Almarai", className: almarai.className },
  { id: "rubik", label: "Rubik", className: rubik.className },
  { id: "poppins", label: "Poppins", className: poppins.className },
  { id: "playfair", label: "Playfair", className: playfair.className },
];

export const DEFAULT_FONT = "tajawal";

const FONT_MAP = new Map(FONTS.map((f) => [f.id, f]));

export function isValidFont(id: string): boolean {
  return FONT_MAP.has(id);
}

export function fontClassName(id: string): string {
  return (FONT_MAP.get(id) ?? FONT_MAP.get(DEFAULT_FONT))!.className;
}
