import Link from "next/link";

// 404 أنيقة موحّدة — لا تكشف إن كان الحساب موجوداً لكنه غير منشور.
export default function PublicNotFound() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-muted/30 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
        A
      </div>
      <h1 className="mt-6 text-2xl font-bold text-foreground">
        الصفحة غير متاحة
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        هذه الصفحة غير موجودة أو غير منشورة.
      </p>
      <Link
        href="https://aktbot.com"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        أنشئ صفحتك على AktBot
      </Link>
    </div>
  );
}
