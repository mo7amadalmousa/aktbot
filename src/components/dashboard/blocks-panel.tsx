"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { str, arr, asRecord } from "@/lib/public/block-config";
import {
  ALL_BLOCK_TYPES,
  BLOCK_META,
  defaultBlockConfig,
  type EditorBlock,
} from "@/lib/creator/editor-types";
import { renderBlockEditor } from "./block-editors/block-editor-registry";

function summary(block: EditorBlock): string {
  const c = block.config;
  switch (block.type) {
    case "LINK":
      return str(c.label) || str(c.url) || "—";
    case "EMBED":
      return str(c.title) || str(c.url) || "—";
    case "GALLERY":
      return `${arr(c.images).length} صورة`;
    case "FORM":
      return `${arr(c.fields).length} حقل`;
    default:
      return str(c.title) || (BLOCK_META[block.type]?.hint ?? "—");
  }
}

function SortableRow({
  block,
  index,
  total,
  editing,
  tabs,
  onToggleEdit,
  onMove,
  onUpdate,
  onRemove,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  editing: boolean;
  tabs: { id: string; label: string }[];
  onToggleEdit: () => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onUpdate: (key: string, patch: Partial<EditorBlock>) => void;
  onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.key });
  const meta = BLOCK_META[block.type];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="rounded-xl border border-border bg-card"
    >
      <div className="flex items-center gap-1.5 p-2.5">
        <button
          type="button"
          aria-label="اسحب لإعادة الترتيب"
          className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
            {meta?.label ?? block.type}
            {meta && !meta.addable ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                قريباً
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {summary(block)}
          </p>
        </div>

        <div className="flex flex-col">
          <button
            type="button"
            aria-label="نقل لأعلى"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="نقل لأسفل"
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          aria-label={block.visibility ? "إخفاء" : "إظهار"}
          onClick={() => onUpdate(block.key, { visibility: !block.visibility })}
          className={cn(
            "rounded-md p-1.5 hover:bg-muted",
            block.visibility ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {block.visibility ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
        </button>

        <button
          type="button"
          aria-label="تحرير"
          onClick={onToggleEdit}
          className={cn(
            "rounded-md p-1.5 hover:bg-muted",
            editing ? "bg-muted text-primary" : "text-foreground",
          )}
        >
          <Pencil className="size-4" />
        </button>

        <button
          type="button"
          aria-label="حذف"
          onClick={() => onRemove(block.key)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {editing ? (
        <div className="border-t border-border p-3">
          {tabs.length > 0 ? (
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-foreground">
                التبويب
              </span>
              <select
                value={str(asRecord(block.config).tabId)}
                onChange={(e) =>
                  onUpdate(block.key, {
                    config: { ...block.config, tabId: e.target.value },
                  })
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                <option value="">التبويب الأوّل</option>
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {renderBlockEditor(block.type, {
            config: block.config,
            onChange: (c) => onUpdate(block.key, { config: c }),
          })}
        </div>
      ) : null}
    </div>
  );
}

export function BlocksPanel({
  blocks,
  onChange,
  tabs = [],
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  tabs?: { id: string; label: string }[];
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.key === active.id);
    const newIndex = blocks.findIndex((b) => b.key === over.id);
    if (oldIndex >= 0 && newIndex >= 0) {
      onChange(arrayMove(blocks, oldIndex, newIndex));
    }
  }

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, index, j));
  };
  const update = (key: string, patch: Partial<EditorBlock>) =>
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const remove = (key: string) => {
    onChange(blocks.filter((b) => b.key !== key));
    if (editingKey === key) setEditingKey(null);
  };
  const add = (type: string) => {
    const nb: EditorBlock = {
      key: crypto.randomUUID(),
      type,
      config: defaultBlockConfig(type),
      visibility: true,
    };
    onChange([...blocks, nb]);
    setPickerOpen(false);
    setEditingKey(nb.key);
  };

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {blocks.map((block, i) => (
              <SortableRow
                key={block.key}
                block={block}
                index={i}
                total={blocks.length}
                tabs={tabs}
                editing={editingKey === block.key}
                onToggleEdit={() =>
                  setEditingKey(editingKey === block.key ? null : block.key)
                }
                onMove={move}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          لا بلوكات بعد — أضِف أوّل بلوك.
        </p>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Plus className="size-4" /> إضافة بلوك
        </button>

        {pickerOpen ? (
          <div className="absolute z-10 mt-2 w-full rounded-xl border border-border bg-popover p-2 shadow-lg">
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_BLOCK_TYPES.map((type) => {
                const meta = BLOCK_META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!meta.addable}
                    onClick={() => meta.addable && add(type)}
                    className={cn(
                      "flex flex-col items-start rounded-lg border border-border p-2.5 text-right transition-colors",
                      meta.addable
                        ? "hover:border-primary hover:bg-primary/5"
                        : "cursor-not-allowed opacity-55",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {meta.label}
                      {!meta.addable ? (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          قريباً
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {meta.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
