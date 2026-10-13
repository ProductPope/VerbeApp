import type { ReactNode, Ref } from 'react';
import type { Tag } from '../../data/model.js';
import { isLanguage, LANGUAGES, type Language, type Strings } from '../i18n/strings.js';
import { CategoryFilter } from './CategoryFilter.js';
import { Icon } from './Icon.js';

const LANGUAGE_NAMES = { en: 'English', pl: 'Polski' } as const;

interface SettingsDialogProps {
  tags: Tag[];
  selectedTags: string[];
  language: Language;
  translation: boolean;
  strings: Strings;
  onTagsChange: (tags: string[]) => void;
  onLanguageChange: (language: Language) => void;
  onTranslationChange: (translation: boolean) => void;
  /** The notification setting, when this build has a push server. */
  notification?: ReactNode;
  ref?: Ref<HTMLDialogElement>;
}

/**
 * Every setting in one modal dialog. The native element traps focus, closes
 * on Escape and returns focus to the button that opened it.
 */
export function SettingsDialog({
  tags,
  selectedTags,
  language,
  translation,
  strings,
  onTagsChange,
  onLanguageChange,
  onTranslationChange,
  notification,
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
        <div className="setting setting-row">
          <label className="setting-label" htmlFor="setting-translation">
            {strings.translationLabel}
          </label>
          <input
            id="setting-translation"
            className="switch"
            type="checkbox"
            role="switch"
            checked={translation}
            aria-describedby="setting-translation-hint"
            onChange={(event) => {
              onTranslationChange(event.target.checked);
            }}
          />
          <p className="setting-hint" id="setting-translation-hint">
            {strings.translationHint}
          </p>
        </div>
        {notification}
        <div className="setting setting-row">
          <label className="setting-label" htmlFor="setting-language">
            {strings.languageLabel}
          </label>
          <select
            id="setting-language"
            value={language}
            onChange={(event) => {
              const value = event.target.value;
              if (isLanguage(value)) onLanguageChange(value);
            }}
          >
            {LANGUAGES.map((option) => (
              <option key={option} value={option} lang={option}>
                {LANGUAGE_NAMES[option]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </dialog>
  );
}
