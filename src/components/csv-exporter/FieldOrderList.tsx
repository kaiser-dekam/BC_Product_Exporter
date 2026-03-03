"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIELD_OPTIONS } from "@/lib/bigcommerce/fields";

interface FieldOrderListProps {
  fields: string[];
  onReorder: (newOrder: string[]) => void;
}

function SortableItem({ id, index }: { id: string; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-xl
        border border-dashed cursor-grab active:cursor-grabbing
        transition-colors duration-150
        ${
          isDragging
            ? "border-accent/50 bg-accent/10 shadow-lg z-10"
            : "border-border bg-white/[0.02] hover:bg-white/5"
        }
      `}
    >
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold text-white shrink-0"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
        }}
      >
        {index + 1}
      </span>
      <span className="text-sm text-text truncate">
        {FIELD_OPTIONS[id] ?? id}
      </span>
      <svg
        className="w-4 h-4 text-muted ml-auto shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 8h16M4 16h16"
        />
      </svg>
    </div>
  );
}

export default function FieldOrderList({
  fields,
  onReorder,
}: FieldOrderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = fields.indexOf(active.id as string);
      const newIndex = fields.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      onReorder(arrayMove(fields, oldIndex, newIndex));
    },
    [fields, onReorder]
  );

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted italic py-4">
        Select fields to define column order.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {fields.map((field, index) => (
            <SortableItem key={field} id={field} index={index} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
