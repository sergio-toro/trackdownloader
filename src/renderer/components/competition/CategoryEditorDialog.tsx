import React, { useState, useEffect, useRef } from "react";
import type {
  CompetitionCategory,
  CategorySelector as CategorySelectorType,
  SelectorComparator,
} from "@main/scoring/types";
import { toSlug } from "@main/scoring/utils/slug";

interface CategoryEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CompetitionCategory[];
  onSave: (
    categories: CompetitionCategory[],
    renameMap: Record<string, string>
  ) => Promise<void>;
}

const ATTRIBUTE_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "glider_class", label: "Glider Class" },
  { value: "nat_code_ioc", label: "Nation" },
  { value: "club", label: "Club" },
];

const COMPARATOR_OPTIONS: { value: SelectorComparator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "begins_with", label: "Begins with" },
  { value: "contains", label: "Contains" },
];

function makeEmptySelector(): CategorySelectorType {
  return { attributeName: "female", comparator: "equals", requiredValue: "" };
}

function makeEmptyCategory(): CompetitionCategory {
  return {
    id: "",
    name: "",
    useFilter: true,
    filterFromCategory: "",
    discardFactor: null,
    selectors: [makeEmptySelector()],
  };
}

const CategoryEditorDialog: React.FC<CategoryEditorDialogProps> = ({
  isOpen,
  onClose,
  categories: initialCategories,
  onSave,
}) => {
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Track original IDs to detect renames
  const originalIds = useRef<Map<number, string>>(new Map());
  // Track which categories have manually edited IDs
  const manualIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      originalIds.current = new Map();
      manualIds.current = new Set();
      const cats =
        initialCategories.length > 0
          ? initialCategories.map((c, i) => {
              originalIds.current.set(i, c.id);
              return { ...c, selectors: [...c.selectors] };
            })
          : [];
      setCategories(cats);
    }
  }, [isOpen, initialCategories]);

  if (!isOpen) return null;

  const updateCategory = (
    index: number,
    updates: Partial<CompetitionCategory>
  ) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        // Auto-derive ID from name if not manually edited
        if ("name" in updates && !manualIds.current.has(i)) {
          updated.id = toSlug(updates.name || "");
        }
        return updated;
      })
    );
  };

  const updateCategoryId = (index: number, id: string) => {
    const sanitized = id.toLowerCase().replace(/[^a-z0-9-]/g, "");
    manualIds.current.add(index);
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, id: sanitized } : c))
    );
  };

  const updateSelector = (
    catIndex: number,
    selIndex: number,
    updates: Partial<CategorySelectorType>
  ) => {
    setCategories((prev) =>
      prev.map((c, i) => {
        if (i !== catIndex) return c;
        const newSelectors = c.selectors.map((s, j) =>
          j === selIndex ? { ...s, ...updates } : s
        );
        return { ...c, selectors: newSelectors };
      })
    );
  };

  const addSelector = (catIndex: number) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === catIndex
          ? { ...c, selectors: [...c.selectors, makeEmptySelector()] }
          : c
      )
    );
  };

  const removeSelector = (catIndex: number, selIndex: number) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === catIndex
          ? { ...c, selectors: c.selectors.filter((_, j) => j !== selIndex) }
          : c
      )
    );
  };

  const addCategory = () => {
    setCategories((prev) => [...prev, makeEmptyCategory()]);
  };

  const removeCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    setCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      // Rebuild originalIds mapping to follow the reorder
      const newOriginalIds = new Map<number, string>();
      const oldMap = new Map(originalIds.current);
      const oldEntries = [...oldMap.entries()].sort((a, b) => a[0] - b[0]);
      const ids = oldEntries.map(([, id]) => id);
      // Apply same reorder to the IDs array
      if (ids.length > 0) {
        const reorderedIds = [...ids];
        const [movedId] = reorderedIds.splice(dragIndex, 1);
        if (movedId !== undefined) {
          reorderedIds.splice(index, 0, movedId);
        }
        reorderedIds.forEach((id, i) => newOriginalIds.set(i, id));
      }
      originalIds.current = newOriginalIds;
      // Rebuild manualIds mapping
      const newManualIds = new Set<number>();
      const oldManualArr = [...manualIds.current];
      for (const mi of oldManualArr) {
        let newIdx = mi;
        if (mi === dragIndex) {
          newIdx = index;
        } else if (dragIndex < index && mi > dragIndex && mi <= index) {
          newIdx = mi - 1;
        } else if (dragIndex > index && mi >= index && mi < dragIndex) {
          newIdx = mi + 1;
        }
        newManualIds.add(newIdx);
      }
      manualIds.current = newManualIds;
      return next;
    });
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const PRESETS: {
    key: string;
    label: string;
    color: string;
    category: CompetitionCategory;
  }[] = [
    {
      key: "women",
      label: "Women",
      color: "bg-pink-100 text-pink-700 hover:bg-pink-200",
      category: {
        ...makeEmptyCategory(),
        name: "Women",
        id: "women",
        selectors: [
          {
            attributeName: "female",
            comparator: "equals",
            requiredValue: "1",
          },
        ],
      },
    },
    {
      key: "serial",
      label: "Serial",
      color: "bg-purple-100 text-purple-700 hover:bg-purple-200",
      category: {
        ...makeEmptyCategory(),
        name: "Serial",
        id: "serial",
        selectors: [
          {
            attributeName: "glider_class",
            comparator: "equals",
            requiredValue: "Serial",
          },
        ],
      },
    },
    {
      key: "sport",
      label: "Sport",
      color: "bg-blue-100 text-blue-700 hover:bg-blue-200",
      category: {
        ...makeEmptyCategory(),
        name: "Sport",
        id: "sport",
        selectors: [
          {
            attributeName: "glider_class",
            comparator: "equals",
            requiredValue: "Sport",
          },
        ],
      },
    },
    {
      key: "club",
      label: "Club",
      color: "bg-green-100 text-green-700 hover:bg-green-200",
      category: {
        ...makeEmptyCategory(),
        name: "Club",
        id: "club",
        selectors: [
          {
            attributeName: "glider_class",
            comparator: "equals",
            requiredValue: "Club",
          },
        ],
      },
    },
    {
      key: "open",
      label: "Open",
      color: "bg-amber-100 text-amber-700 hover:bg-amber-200",
      category: {
        ...makeEmptyCategory(),
        name: "Open",
        id: "open",
        selectors: [
          {
            attributeName: "glider_class",
            comparator: "equals",
            requiredValue: "Open",
          },
        ],
      },
    },
  ];

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setCategories((prev) => [
      ...prev,
      {
        ...preset.category,
        selectors: [...preset.category.selectors],
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const valid = categories.filter((c) => c.name.trim());
      // Build rename map from originalIds
      const renameMap: Record<string, string> = {};
      for (const [idx, oldId] of originalIds.current.entries()) {
        const cat = categories[idx];
        if (cat && cat.id && cat.id !== oldId) {
          renameMap[oldId] = cat.id;
        }
      }
      await onSave(valid, renameMap);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const isCustomAttribute = (attr: string) => attr.startsWith("ca:");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Category Editor
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Presets */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-gray-500">Quick add:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset)}
                className={`px-2 py-1 text-xs rounded ${preset.color}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Categories */}
          {categories.map((cat, catIdx) => (
            <div
              key={catIdx}
              draggable
              onDragStart={() => handleDragStart(catIdx)}
              onDragOver={(e) => handleDragOver(e, catIdx)}
              onDrop={() => handleDrop(catIdx)}
              onDragEnd={handleDragEnd}
              className={`border rounded-lg p-4 space-y-3 transition-colors ${
                dragIndex === catIdx
                  ? "opacity-50 border-gray-300"
                  : dropIndex === catIdx && dragIndex !== null
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 mt-5 flex-shrink-0"
                  title="Drag to reorder"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) =>
                        updateCategory(catIdx, { name: e.target.value })
                      }
                      placeholder="e.g. Women, Serial, Sport"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      ID
                    </label>
                    <input
                      type="text"
                      value={cat.id}
                      onChange={(e) => updateCategoryId(catIdx, e.target.value)}
                      placeholder="auto-generated"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeCategory(catIdx)}
                  className="mt-5 text-red-400 hover:text-red-600"
                  title="Remove category"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-500">
                  Selectors (all must match)
                </label>
                {cat.selectors.map((sel, selIdx) => (
                  <div key={selIdx} className="flex gap-2 items-center">
                    {isCustomAttribute(sel.attributeName) ? (
                      <input
                        type="text"
                        value={sel.attributeName}
                        onChange={(e) =>
                          updateSelector(catIdx, selIdx, {
                            attributeName: e.target.value,
                          })
                        }
                        placeholder="ca:attribute"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
                      />
                    ) : (
                      <select
                        value={sel.attributeName}
                        onChange={(e) =>
                          updateSelector(catIdx, selIdx, {
                            attributeName: e.target.value,
                          })
                        }
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {ATTRIBUTE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        <option value="ca:">Custom (ca:...)</option>
                      </select>
                    )}

                    <select
                      value={sel.comparator}
                      onChange={(e) =>
                        updateSelector(catIdx, selIdx, {
                          comparator: e.target.value as SelectorComparator,
                        })
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {COMPARATOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={sel.requiredValue}
                      onChange={(e) =>
                        updateSelector(catIdx, selIdx, {
                          requiredValue: e.target.value,
                        })
                      }
                      placeholder="Value"
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    />

                    {cat.selectors.length > 1 && (
                      <button
                        onClick={() => removeSelector(catIdx, selIdx)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove selector"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addSelector(catIdx)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  + Add selector
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No categories defined. Add one or use a quick preset above.
            </div>
          )}

          <button
            onClick={addCategory}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600"
          >
            + Add Category
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryEditorDialog;
