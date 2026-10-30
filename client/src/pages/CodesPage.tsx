import { NavLink, Navigate, Outlet } from "react-router";
import { useAuth } from "../auth";

// To add a sub-tab: add a line here and a matching <Route> in App.tsx.
const subTabs = [
  { to: "edit", label: "Edit" },
  { to: "all", label: "All Codes" },
  { to: "drill", label: "Drill" },
];

// The frame for everything under /codes: a row of sub-tabs, then whichever
// sub-tab is selected (<Outlet />).
export default function CodesPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div>
      {/* Scrolls sideways inside itself if there are ever more tabs than fit; the page never does. */}
      <nav aria-label="Codes sections" className="-mt-2 mb-4 flex overflow-x-auto border-b border-slate-700">
        {subTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-300 ${
                isActive
                  ? "border-indigo-400 text-slate-100"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
