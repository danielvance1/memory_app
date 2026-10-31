import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { ApiError, api } from "../api";
import { useAuth } from "../auth";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminUsersReply {
  users: AdminUser[];
  total: number;
  max: number;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function formatLastLogin(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "Never";
}

// Admin-only: a grid of every account's username, email, and last login.
// The server enforces who may see this; the redirects below are just courtesy.
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<AdminUsersReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.isAdmin === true;

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    api<AdminUsersReply>("/api/admin/users", { signal: controller.signal })
      .then(setData)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Couldn't load the user list.");
      });
    return () => controller.abort();
  }, [isAdmin]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl">Users</h2>
        {data && (
          <p className="text-sm text-muted">
            {data.total} of {data.max} accounts
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 bg-danger/15 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {!data && !error && <p className="mt-4 text-muted">Loading…</p>}

      {data && (
        <div className="mt-4 overflow-x-auto bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">
                  Username
                </th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">
                  Email
                </th>
                <th scope="col" className="px-3 py-3 font-medium sm:px-4">
                  Last login
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.users.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3 align-top font-medium sm:px-4">
                    <span className="break-all">{row.username}</span>
                    {row.isAdmin && (
                      <span className="ml-2 bg-brand/20 px-2 py-0.5 text-xs font-medium text-brand">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="break-all px-3 py-3 align-top text-fg-dim sm:px-4">{row.email}</td>
                  <td className="px-3 py-3 align-top text-fg-dim sm:whitespace-nowrap sm:px-4">
                    {formatLastLogin(row.lastLoginAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
