import type { Locale } from "./config";
import type { Messages } from "./types";
import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { tr } from "./messages/tr";

const DICT: Record<Locale, Messages> = { ar, en, tr };

export function getMessages(locale: Locale): Messages {
  return DICT[locale];
}

export type { Messages } from "./types";
export * from "./config";
