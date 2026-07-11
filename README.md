# AktBot

منصّة B2C لتسويق المبدعين في قطاع الجمال — **البرومبت 01: Bootstrap + Health Check**.
الهدف من هذه اللبنة إثبات أنّ الأنبوب كامل يعمل: التطبيق ↔ Neon Postgres.

## الـ Stack

- Next.js **16** (App Router · Turbopack · `proxy.ts` بدل `middleware.ts`)
- TypeScript · Node.js 20+
- Tailwind CSS **4** + shadcn/ui + lucide-react
- خط **Tajawal** (عبر `next/font/google`) · افتراضي عربي RTL
- Prisma + Neon Postgres (اتصال pooled)
- الهوية: Primary/Accent **Teal `#278A8F`** · دعم فاتح/داكن

## التشغيل محلياً

```bash
npm install
cp .env.example .env      # ثمّ املأ DATABASE_URL بسلسلة Neon المجمّعة
npx prisma generate
npx prisma migrate deploy # يطبّق أوّل migration على قاعدة موجودة
npm run dev               # http://localhost:3000
```

- الصفحة الرئيسية: `/`
- فحص السلامة (UI): `/health` — يجب أن تظهر «✓ متصل» وسجلّ من القاعدة.
- فحص السلامة (JSON): `/api/health` — يرجّع `{ status, db, records, time }`.

## النشر على السيرفر (لعمر)

1. **Backup** احترازيّ لأي قاعدة/بيانات قائمة.
2. سحب `feature/bootstrap` من GitHub.
3. `npm install` (يشغّل `prisma generate` تلقائياً عبر `postinstall`).
4. ضبط `.env`: `DATABASE_URL` (Neon pooled) · `NEXT_PUBLIC_APP_URL`.
5. `npx prisma migrate deploy` — **لا** `migrate dev/reset` على بيئة مشتركة.
6. `npm run build` ثمّ التشغيل عبر PM2.
7. ضبط Nginx للدومين + SSL.
8. فحص ما بعد النشر: افتح `/health` (يجب «✓ متصل») و`/api/health` (JSON سليم).

## قاعدة ثابتة

قاعدة البيانات **additive فقط** — ممنوع حذف أيّ عمود/جدول/بيانات قائمة.
