import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { startActionTracking, pushAction } from "@/lib/actionTracker";

/**
 * Mounts global action tracking and records route changes.
 */
export function useActionTrail() {
  const location = useLocation();

  useEffect(() => {
    const stop = startActionTracking();
    return stop;
  }, []);

  useEffect(() => {
    pushAction({
      event_type: "navigate",
      label: `Navigated to ${location.pathname}`,
      target: location.pathname,
      page_url: location.pathname + location.search,
    });
  }, [location.pathname, location.search]);
}
