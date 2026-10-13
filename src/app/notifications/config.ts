/**
 * Address of the push server (see worker/). Set at build time; when it is
 * empty the app hides the notification setting.
 */
export const PUSH_API_URL: string = import.meta.env.VITE_PUSH_API_URL ?? '';
