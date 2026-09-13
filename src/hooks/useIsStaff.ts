import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Staff = admin or moderator. Regular users only see their own reports. */
export function useIsStaff() {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsStaff(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        setIsStaff((data || []).some((r) => r.role === "admin" || r.role === "moderator"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return { isStaff, loading };
}
