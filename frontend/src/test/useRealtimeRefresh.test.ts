import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

describe("useRealtimeRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes immediately when the window gains focus", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRealtimeRefresh({ onRefresh, interval: 15000 }));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the tab becomes visible again", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRealtimeRefresh({ onRefresh, interval: 15000 }));

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("polls on the interval while the tab is visible", () => {
    const onRefresh = vi.fn();
    renderHook(() => useRealtimeRefresh({ onRefresh, interval: 15000 }));

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it("does not poll when paused", () => {
    const onRefresh = vi.fn();
    const { rerender } = renderHook(
      ({ paused }) => useRealtimeRefresh({ onRefresh, interval: 15000, paused }),
      { initialProps: { paused: true } }
    );

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(onRefresh).not.toHaveBeenCalled();

    rerender({ paused: false });

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not poll while the document is hidden", () => {
    const onRefresh = vi.fn();
    const hideSpy = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("hidden" as DocumentVisibilityState);

    renderHook(() => useRealtimeRefresh({ onRefresh, interval: 15000 }));

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
    hideSpy.mockRestore();
  });

  it("stops listening after unmount", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtimeRefresh({ onRefresh, interval: 15000 })
    );

    unmount();

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });
});