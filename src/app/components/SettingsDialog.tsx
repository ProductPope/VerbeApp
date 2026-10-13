import type { Ref } from 'react';
import type { Tag } from '../../data/model.js';
import type { Language, Strings } from '../i18n/strings.js';
import { CategoryFilter } from './CategoryFilter.js';
import { Icon } from './Icon.js';

interface SettingsDialogProps {
  tags: Tag[];
  selectedTags: string[];
  language: Language;
  strings: Strings;
  onTagsChange: (tags: string[]) => void;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * Feed settings in one modal dialog; reading preferences live in the profile.
 * The native element traps focus, closes on Escape and returns focus to the
 * button that opened it.
 */
export function SettingsDialog({
  tags,
  selectedTags,
  language,
  strings,
  onTagsChange,
  ref,
}: SettingsDialogProps) {
  return (
    <dialog ref={ref} className="settings" aria-labelledby="settings-heading">
      <div className="settings-header">
        <h2 id="settings-heading">{strings.settings}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={(event) => {
            event.currentTarget.closest('dialog')?.close();
          }}
        >
          <Icon name="close" />
          <span className="visually-hidden">{strings.close}</span>
        </button>
      </div>
      <div className="settings-body">
        <div className="setting">
          <span className="setting-label" id="categories-label">
            {strings.categoriesLabel}
          </span>
          <CategoryFilter
            tags={tags}
            selected={selectedTags}
            language={language}
            strings={strings}
            labelId="categories-label"
            onChange={onTagsChange}
          />
        </div>
      </div>
    </dialog>
  );
}
