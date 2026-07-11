import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
        A
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">AktBot</h1>
        <p className="text-muted-foreground">منصة تسويق المبدعين في قطاع الجمال</p>
      </div>
      <Link href="/health" className={buttonVariants({ size: "lg" })}>
        فحص السلامة
      </Link>
    </main>
  );
}
