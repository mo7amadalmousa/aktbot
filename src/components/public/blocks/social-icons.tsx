import type { IconType } from "react-icons";
import {
  SiInstagram,
  SiTiktok,
  SiYoutube,
  SiSnapchat,
  SiX,
  SiFacebook,
  SiWhatsapp,
  SiTelegram,
  SiThreads,
  SiPinterest,
} from "react-icons/si";
import { FaLinkedin } from "react-icons/fa6";
import { Globe } from "lucide-react";

// خريطة المنصّة → أيقونة العلامة (Simple Icons + Font Awesome لـLinkedIn).
// منصّة غير معروفة → أيقونة عامّة (Globe).
const ICONS: Record<string, IconType> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  snapchat: SiSnapchat,
  x: SiX,
  facebook: SiFacebook,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
  linkedin: FaLinkedin,
  threads: SiThreads,
  pinterest: SiPinterest,
};

export function SocialIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const Icon = ICONS[platform] ?? Globe;
  return <Icon className={className} aria-hidden />;
}
