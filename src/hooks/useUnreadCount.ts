import { useCallback, useEffect, useState } from "react";
import { getUnreadCount } from "@/lib/api/client";

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const refetch = useCallback(() => {
    getUnreadCount().then((res) => {
      setCount(res.data?.count ?? 0);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = () => {
      getUnreadCount().then((res) => {
        if (!cancelled) setCount(res.data?.count ?? 0);
      });
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { count, refetch };
}
