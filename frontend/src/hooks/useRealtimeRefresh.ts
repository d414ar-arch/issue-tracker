import { useEffect, useRef } from "react";

interface UseRealtimeRefreshOptions {
  onRefresh: () => void | Promise<void>;
  interval?: number;
  paused?: boolean;
}

// Automatically re-fetches data when the user returns to the tab (focus /
// visibilitychange) and polls every `interval` ms while the tab is visible.
// Polling is skipped while `paused` is true (e.g. during an active drag).
export function useRealtimeRefresh({
  onRefresh,
  interval = 15000,
  paused = false,
}: UseRealtimeRefreshOptions) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let visible = document.visibilityState === "visible";

    const handleVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) {
        void onRefreshRef.current();
      }
    };

    const handleFocus = () => {
      if (visible || document.visibilityState === "visible") {
        void onRefreshRef.current();
      }
    };

    const timer = window.setInterval(() => {
      if (visible && !paused) {
        void onRefreshRef.current();
      }
    }, interval);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [interval, paused]);
}