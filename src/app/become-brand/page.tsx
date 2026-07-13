import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { BrandActivateForm } from "@/components/brand/activate-form";

export const dynamic = "force-dynamic";

export default async function BecomeBrandPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/become-brand");

  // علامة بالفعل؟ → لوحة العلامة.
  if (session.role === "BRAND") {
    const brand = await prisma.brandProfile.findUnique({
      where: { userId: session.sub },
      select: { id: true },
    });
    if (brand) redirect("/brand");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <BrandActivateForm />
    </main>
  );
}
