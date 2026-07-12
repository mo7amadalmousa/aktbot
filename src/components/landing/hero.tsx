"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMessages } from "@/components/i18n/i18n-provider";
import { SIGNUP_URL } from "@/lib/site";
import { PrimaryCta, SecondaryCta } from "./landing-ui";
import { PhoneMockup } from "./phone-mockup";

export function Hero() {
  const t = useMessages().landing.hero;

  return (
    <section className="relative overflow-hidden">
      {/* توهّج خلفيّ خفيف */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-80 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 40%, rgba(39,138,143,0.35), transparent 70%)",
        }}
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            {t.eyebrow}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryCta href={SIGNUP_URL}>{t.ctaCreator}</PrimaryCta>
            <SecondaryCta href={SIGNUP_URL}>{t.ctaBrand}</SecondaryCta>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
