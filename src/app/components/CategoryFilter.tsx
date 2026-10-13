import type { Tag } from '../../data/model.js';
import { localized } from '../catalog/catalog.js';
import type { Language, Strings } from '../i18n/strings.js';

interface CategoryFilterProps {
  tags: Tag[];
  selected: string[];
  language: Language;
  strings: Strings;
  /** Id of the visible element that names the group. */
  labelId: string;
  onChange: (selected: string[]) => void;
}

/** Toggle buttons for categories; none selected means all. */
export function CategoryFilter({
  tags,
  selected,
  language,
  strings,
  labelId,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="chips" role="group" aria-labelledby={labelId}>
      <button
        type="button"
        className="chip"
        aria-pressed={selected.length === 0}
        onClick={() => {
          onChange([]);
        }}
      >
        {strings.allCategories}
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          className="chip"
          aria-pressed={selected.includes(tag.id)}
          title={localized(tag.description, language)}
          onClick={() => {
            onChange(
              selected.includes(tag.id)
                ? selected.filter((id) => id !== tag.id)
                : [...selected, tag.id],
            );
          }}
        >
          {localized(tag.label, language)}
        </button>
      ))}
    </div>
  );
}
