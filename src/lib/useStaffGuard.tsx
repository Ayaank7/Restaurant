import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Role } from "@/server/types";
import { clearStaffSession, getStaffUser, onAuthChange, type StaffUserInfo } from "@/lib/auth";

export function useStaffGuard(allowed: Role[]): StaffUserInfo | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<StaffUserInfo | null>(() => getStaffUser());

  useEffect(() => {
    const check = () => {
      const u = getStaffUser();
      setUser(u);
      if (!u) {
        navigate({ to: "/login" });
        return;
      }
      if (!allowed.includes(u.role)) {
        if (u.role === "ADMIN") navigate({ to: "/admin" });
        else if (u.role === "WAITER") navigate({ to: "/waiter" });
        else if (u.role === "KITCHEN") navigate({ to: "/kitchen" });
      }
    };
    check();
    const unsub = onAuthChange(check);
    return () => { unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user;
}

export function StaffHeaderUser({ user }: { user: StaffUserInfo | null }) {
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="flex items-center gap-4">
      <span className="uppercase-label text-charcoal/60 hidden md:inline">
        {user.name} · {user.role}
      </span>
      <button
        onClick={() => { clearStaffSession(); navigate({ to: "/login" }); }}
        className="uppercase-label text-charcoal/50 hover:text-charcoal"
      >
        Sign Out
      </button>
    </div>
  );
}
