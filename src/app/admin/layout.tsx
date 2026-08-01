import { AdminNav } from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink/50">Admin</p>
      <AdminNav />
      {children}
    </div>
  );
}
