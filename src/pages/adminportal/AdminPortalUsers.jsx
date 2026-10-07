import { useMemo, useState } from "react";
import Card from "../../components/Card";
import { SkeletonTableRows } from "../../components/Skeleton";
import SortableHeader from "../../components/SortableHeader";
import { useSortableData } from "../../utils/useSortableData";
import { useAdminPortalData } from "../../hooks/useAdminPortalData";
import { Download, Search, Sprout, Users2, ShieldCheck, Radio, MapPin } from "lucide-react";
import { addRipple } from "../../utils/ripple";
import { useToast } from "../../components/ToastContext";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function roleIcon(role) {
  if (role === "Farmer") return Sprout;
  if (role === "PDMA Officer") return ShieldCheck;
  return Users2;
}

export default function AdminPortalUsers() {
  const { directory, counts, loading, errors } = useAdminPortalData();
  const { showToast } = useToast();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("All");

  const roles = ["All", "Farmer", "General Public", "PDMA Officer"];
  const districts = useMemo(
    () => ["All", ...Array.from(new Set(directory.map((u) => u.district).filter(Boolean))).sort()],
    [directory]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return directory.filter((u) => {
      const roleOk = filter === "All" || u.role === filter;
      const districtOk = district === "All" || u.district === district;
      const searchOk = !q || [u.name, u.email, u.phone, u.district, u.crop, u.designation, u.role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
      return roleOk && districtOk && searchOk;
    });
  }, [directory, filter, district, search]);

  const sortableRows = filtered.map((u) => ({
    ...u,
    sortName: u.name || "",
    sortRole: u.role,
    sortDistrict: u.district || "",
    sortDate: u.approved_at || u.created_at || "",
  }));
  const { sorted, sortConfig, requestSort } = useSortableData(sortableRows);

  function exportCsv() {
    const headers = ["User ID", "Name", "Email", "Phone", "Role", "District", "Tehsil", "Crop", "Farm Size", "Designation", "Approved At"];
    const rows = sorted.map((u) => [
      u.user_id || u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.district,
      u.tehsil,
      u.crop,
      u.farm_size || u.farmSize,
      u.designation,
      u.approved_at,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agriwatch-approved-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${sorted.length} live users to CSV`, "success");
  }

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-7 page-enter">
      <section className="portal-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="portal-chip"><Radio size={12} /> Live approved directory</span>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-3">Users & PDMA officers</h1>
            <p className="text-white/72 mt-2 max-w-2xl">Every row below comes from the real approved-role tables in Supabase and updates in realtime.</p>
          </div>
          <div className="portal-chip">{counts.totalUsers} active accounts</div>
        </div>
        <div className="portal-hero-grid">
          <div className="portal-metric"><p className="portal-metric-label">Farmers</p><p className="portal-metric-value">{counts.farmers}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">General public</p><p className="portal-metric-value">{counts.publicUsers}</p></div>
          <div className="portal-metric"><p className="portal-metric-label">PDMA officers</p><p className="portal-metric-value">{counts.pdmaOfficers}</p></div>
        </div>
      </section>

      {errors.length > 0 && (
        <Card className="border-danger/30 bg-danger/5"><p className="text-sm text-danger">Some approved-role tables could not be loaded. Check the Query 10 RLS setup.</p></Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!p-4 transition-all hover:-translate-y-0.5"><p className="text-xs text-ink/45">Total approved</p><p className="text-2xl font-semibold mt-1">{counts.totalUsers}</p></Card>
        <Card className="!p-4 transition-all hover:-translate-y-0.5"><p className="text-xs text-ink/45">Farmers</p><p className="text-2xl font-semibold mt-1">{counts.farmers}</p></Card>
        <Card className="!p-4 transition-all hover:-translate-y-0.5"><p className="text-xs text-ink/45">General public</p><p className="text-2xl font-semibold mt-1">{counts.publicUsers}</p></Card>
        <Card className="!p-4 transition-all hover:-translate-y-0.5"><p className="text-xs text-ink/45">PDMA officers</p><p className="text-2xl font-semibold mt-1">{counts.pdmaOfficers}</p></Card>
      </div>

      <Card className="!p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, district, crop…" className="w-full bg-paper border border-line rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/50" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {roles.map((r) => (
              <button key={r} onClick={() => setFilter(r)} onMouseDown={addRipple} className={`btn-animated px-3 py-2 rounded-lg text-xs font-medium border ${filter === r ? "bg-forest text-white border-forest" : "bg-surface text-ink/60 border-line hover:bg-paper-dim"}`}>{r}</button>
            ))}
          </div>
          <select value={district} onChange={(e) => setDistrict(e.target.value)} className="border border-line rounded-lg px-3 py-2 text-xs bg-surface">
            {districts.map((d) => <option key={d} value={d}>{d === "All" ? "All districts" : d}</option>)}
          </select>
          <button onClick={exportCsv} onMouseDown={addRipple} className="btn-animated flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-primary-light">
            <Download size={14} /> Export live CSV
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-display font-semibold">Approved account directory</p>
            <p className="text-xs text-ink/45 mt-0.5">Showing {filtered.length} of {directory.length} accounts.</p>
          </div>
          <span className="text-[11px] text-primary font-mono flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> realtime</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                <SortableHeader label="Name" sortKey="sortName" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="Role" sortKey="sortRole" sortConfig={sortConfig} onSort={requestSort} />
                <SortableHeader label="District" sortKey="sortDistrict" sortConfig={sortConfig} onSort={requestSort} />
                <th className="pb-2 font-medium">Contact</th>
                <th className="pb-2 font-medium">Role details</th>
                <SortableHeader label="Approved" sortKey="sortDate" sortConfig={sortConfig} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows rows={7} cols={6} />
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-ink/45">No approved users match the current filters.</td></tr>
              ) : sorted.map((u) => {
                const Icon = roleIcon(u.role);
                return (
                  <tr key={u.directoryKey} className="border-b border-line last:border-0 hover:bg-paper-dim/60 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon size={14} className="text-primary" /></div>
                        <div className="min-w-0"><p className="font-medium truncate max-w-[220px]">{u.name}</p><p className="text-[11px] text-ink/35 font-mono truncate max-w-[220px]">{u.user_id || u.id}</p></div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ink/65">{u.role}</td>
                    <td className="py-3 pr-4"><span className="inline-flex items-center gap-1 text-ink/65"><MapPin size={12} /> {u.district || "—"}</span></td>
                    <td className="py-3 pr-4"><p className="text-ink/70">{u.email || "—"}</p><p className="text-xs text-ink/40 mt-0.5">{u.phone || ""}</p></td>
                    <td className="py-3 pr-4 text-ink/60">{u.role === "Farmer" ? [u.crop, u.farm_size || u.farmSize].filter(Boolean).join(" · ") || "—" : u.role === "PDMA Officer" ? u.designation || "—" : u.tehsil || "—"}</td>
                    <td className="py-3 text-xs font-mono text-ink/50">{fmtDate(u.approved_at || u.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
