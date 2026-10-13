import { useState } from 'react';
import type { Strings } from '../i18n/strings.js';
import { NotificationsBlockedError, type PushService } from '../notifications/push.js';

interface NotificationSettingProps {
  push: PushService;
  enabled: boolean;
  hour: number;
  strings: Strings;
  onChange: (change: { notify: boolean; notifyHour: number }) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Switch and time for the daily quote notification. */
export function NotificationSetting({
  push,
  enabled,
  hour,
  strings,
  onChange,
}: NotificationSettingProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(notify: boolean, notifyHour: number) {
    setBusy(true);
    setError(null);
    try {
      if (notify) await push.subscribe(notifyHour);
      else await push.unsubscribe();
      onChange({ notify, notifyHour });
    } catch (caught) {
      setError(
        caught instanceof NotificationsBlockedError
          ? strings.notificationBlocked
          : strings.notificationFailed,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="setting setting-row">
      <label className="setting-label" htmlFor="setting-notification">
        {strings.notificationLabel}
      </label>
      <input
        id="setting-notification"
        className="switch"
        type="checkbox"
        role="switch"
        checked={enabled}
        disabled={busy}
        aria-describedby="setting-notification-hint setting-notification-error"
        onChange={(event) => {
          void apply(event.target.checked, hour);
        }}
      />
      <p className="setting-hint" id="setting-notification-hint">
        {strings.notificationHint}
      </p>
      {enabled && (
        <>
          <label className="setting-sublabel" htmlFor="setting-notification-hour">
            {strings.notificationTime}
          </label>
          <select
            id="setting-notification-hour"
            value={hour}
            disabled={busy}
            onChange={(event) => {
              void apply(true, Number(event.target.value));
            }}
          >
            {HOURS.map((option) => (
              <option key={option} value={option}>
                {formatHour(option)}
              </option>
            ))}
          </select>
        </>
      )}
      <p className="setting-error" id="setting-notification-error" role="status">
        {error}
      </p>
    </div>
  );
}
