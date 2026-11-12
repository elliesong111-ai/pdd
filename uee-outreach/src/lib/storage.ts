import { useEffect, useState } from "react";

const PREFIX = "uee-outreach:";

export function usePersistentState<T>(key: string, initial: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch { /* ignore corrupt storage */ }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });
  useEffect(() => {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* storage full / disabled */ }
  }, [key, value]);
  return [value, setValue];
}

export function clearAll() {
  Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k));
}

export function download(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
