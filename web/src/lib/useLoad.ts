import { useEffect, useState } from "react";
import { msg } from "./labels";

type State<T> = { data: T | null; error: string | null; key: string };

// Runs `fetcher` whenever `key` or the retry counter changes; stale results are dropped.
export function useLoad<T>(key: string, fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, key });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetcher().then(
      (data) => alive && setState({ data, error: null, key }),
      (e) => alive && setState({ data: null, error: msg(e), key }),
    );
    return () => {
      alive = false;
    };
    // fetcher is recreated every render; `key` identifies its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    retry: () => {
      setState({ data: null, error: null, key });
      setAttempt((n) => n + 1);
    },
  };
}
