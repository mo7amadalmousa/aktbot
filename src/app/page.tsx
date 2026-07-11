import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
          A
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">AktBot</h1>
          <p className="max-w-sm text-muted-foreground">
            منصّة صفحتك الواحدة لتسويق المبدعين في قطاع الجمال.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className={buttonVariants({ size: "lg" })}>
          أنشئ حسابك
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          تسجيل الدخول
        </Link>
      </div>

      <Link
        href="/health"
        className="text-xs text-muted-foreground hover:underline"
      >
        حالة النظام
      </Link>
    </main>
  );
}
