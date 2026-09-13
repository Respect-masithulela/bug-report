import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIsStaff } from "@/hooks/useIsStaff";
import { ProtectedRoute } from "./ProtectedRoute";

/** Only admins/moderators; everyone else goes to their own bug list. */
export function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isStaff, loading } = useIsStaff();

  return (
    <ProtectedRoute>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isStaff ? (
        <>{children}</>
      ) : (
        <Navigate to="/bugs" replace />
      )}
    </ProtectedRoute>
  );
}
