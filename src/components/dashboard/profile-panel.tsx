"use client";

import { BadgeCheck } from "lucide-react";
import { Field, TextInput, TextArea, Toggle } from "@/components/dashboard/field";
import type { EditorProfile } from "@/lib/creator/editor-types";

const SOCIAL_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "instagram", label: "إنستغرام", placeholder: "https://instagram.com/…" },
  { key: "tiktok", label: "تيك توك", placeholder: "https://tiktok.com/@…" },
  { key: "youtube", label: "يوتيوب", placeholder: "https://youtube.com/@…" },
  { key: "x", label: "X (تويتر)", placeholder: "https://x.com/…" },
  { key: "facebook", label: "فيسبوك", placeholder: "https://facebook.com/…" },
  { key: "website", label: "الموقع", placeholder: "https://…" },
];

export function ProfilePanel({
  profile,
  initialUsername,
  onChange,
}: {
  profile: EditorProfile;
  initialUsername: string;
  onChange: (patch: Partial<EditorProfile>) => void;
}) {
  const setSocial = (key: string, value: string) =>
    onChange({ socialLinks: { ...profile.socialLinks, [key]: value } });

  return (
    <div className="space-y-4">
      <Field label="الاسم الظاهر">
        <TextInput
          value={profile.displayName}
          onChange={(v) => onChange({ displayName: v })}
          placeholder="اسمك أو اسم علامتك"
        />
      </Field>

      <Field label="نبذة">
        <TextArea
          value={profile.bio}
          onChange={(v) => onChange({ bio: v })}
          placeholder="سطر أو اثنان عنك…"
        />
      </Field>

      <Field label="رابط صورة الأفاتار" hint="http/https — رفع الصور قريباً">
        <TextInput
          value={profile.avatarUrl}
          onChange={(v) => onChange({ avatarUrl: v })}
          placeholder="https://…/avatar.jpg"
          type="url"
        />
      </Field>

      <Field
        label="اسم المستخدم (رابط صفحتك)"
        hint={
          profile.username !== initialUsername
            ? "⚠️ تغيير اسم المستخدم يغيّر رابط صفحتك العامّة."
            : "aktbot.link/" + (profile.username || "username")
        }
      >
        <TextInput
          value={profile.username}
          onChange={(v) => onChange({ username: v })}
          placeholder="username"
        />
      </Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          روابط اجتماعية
        </p>
        <div className="space-y-2">
          {SOCIAL_FIELDS.map((s) => (
            <Field key={s.key} label={s.label}>
              <TextInput
                value={profile.socialLinks[s.key] ?? ""}
                onChange={(v) => setSocial(s.key, v)}
                placeholder={s.placeholder}
                type="url"
              />
            </Field>
          ))}
        </div>
      </div>

      {/* عرض فقط — يُدار من الإدارة لاحقاً */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <span className="flex items-center gap-1 text-foreground">
          <BadgeCheck className="size-4 text-primary" />
          {profile.isVerified ? "موثّق" : "غير موثّق"}
        </span>
        <span className="text-muted-foreground">
          {profile.followerCount.toLocaleString("en-US")} متابع
        </span>
        <span className="text-[11px] text-muted-foreground">(عرض فقط)</span>
      </div>

      <div className="rounded-xl border border-border p-3">
        <Toggle
          checked={profile.isPublished}
          onChange={(v) => onChange({ isPublished: v })}
          label={profile.isPublished ? "منشورة ✓" : "غير منشورة"}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          عند النشر تظهر صفحتك على aktbot.link/{profile.username || "username"}.
        </p>
      </div>
    </div>
  );
}
