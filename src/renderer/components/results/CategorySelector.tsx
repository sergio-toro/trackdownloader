import React from "react";
import type { CompetitionCategory } from "@main/scoring/types";

interface CategorySelectorProps {
  categories: CompetitionCategory[];
  selectedCategoryId: string | null;
  onChange: (id: string | null) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onChange,
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
          selectedCategoryId === null
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        Overall
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-3 py-1.5 rounded text-sm whitespace-nowrap ${
            selectedCategoryId === cat.id
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategorySelector;
