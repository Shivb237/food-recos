import { useEffect, useState } from "preact/hooks";

type Listener = (msg: string) => void;
const listeners = new Set<Listener>();

export const toast = (msg: string) => listeners.forEach((l) => l(msg));

export function useToast(): string | null {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const l: Listener = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2400);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      clearTimeout(t);
    };
  }, []);
  return msg;
}
