"use client";

import { createContext, useContext } from "react";
import type { Overrides, FieldType } from "@/lib/cms/fields";

// تعريف حقول عنصر القائمة (للمحرّر) — مفاتيح + وسوم.
export interface ListFieldDef {
  key: string;
  label: string;
  type?: "text" | "image";
}

export interface CmsAdminApi {
  editMode: boolean;
  dirty: boolean;
  busy: boolean;
  openEditor: (
    field: string,
    type: FieldType,
    current: unknown,
    opts?: { listFields?: ListFieldDef[]; defText?: string; defHref?: string },
  ) => void;
  toggleSection: (id: string) => void;
}

export interface CmsValue {
  values: Overrides;
  admin: CmsAdminApi | null; // null للزائر (لا واجهة تحرير)
}

const CmsCtx = createContext<CmsValue>({ values: {}, admin: null });

export function useCms(): CmsValue {
  return useContext(CmsCtx);
}

export const CmsContextProvider = CmsCtx.Provider;
