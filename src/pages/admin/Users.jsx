import { useState } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card from "../../components/Card";
import { users } from "../../data/dummyData";
import { Download } from "lucide-react";

export default function Users() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState("All");
  const roles = ["All", "Farmer", "General Public", "Admin / PDMA"];
  const filtered = filter === "All" ? users : users.filter((u) => u.role === filter);

  return (
    <>
      <Topbar title={t("ptAdminUsersTitle")} subtitle={t("ptAdminUsersSub")} />
      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === r ? "bg-forest text-white border-forest" : "bg-white text-ink/60 border-line hover:bg-paper-dim"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-white border border-line rounded-lg px-3 py-2 text-xs font-medium hover:bg-paper-dim">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">District</th>
                  <th className="pb-2 font-medium">Crop</th>
                  <th className="pb-2 font-medium">Farm Size</th>
                  <th className="pb-2 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                    <td className="py-2.5 font-mono text-xs text-ink/50">{u.id}</td>
                    <td className="py-2.5 font-medium">{u.name}</td>
                    <td className="py-2.5 text-ink/60">{u.role}</td>
                    <td className="py-2.5 text-ink/60">{u.district}</td>
                    <td className="py-2.5 text-ink/60">{u.crop}</td>
                    <td className="py-2.5 text-ink/60">{u.farmSize}</td>
                    <td className="py-2.5 font-mono text-xs text-ink/50">{u.registered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
