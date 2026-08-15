import { useState } from "react";
import Topbar from "../../components/Topbar";
import { useLanguage } from "../../i18n/LanguageContext";
import Card, { SeverityBadge } from "../../components/Card";
import { alerts as initialAlerts, districts } from "../../data/dummyData";
import { Send } from "lucide-react";

export default function Alerts() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [form, setForm] = useState({ district: districts[0].name, severity: "Moderate", message: "", audience: "Farmers + Public" });

  function handleSend(e) {
    e.preventDefault();
    if (!form.message.trim()) return;
    const newAlert = {
      id: `AL-${1000 + alerts.length + 1}`,
      district: form.district,
      severity: form.severity,
      message: form.message,
      sentTo: form.audience,
      date: new Date().toISOString().slice(0, 10),
      status: "Delivered",
    };
    setAlerts([newAlert, ...alerts]);
    setForm({ ...form, message: "" });
  }

  return (
    <>
      <Topbar title={t("ptAdminAlertsTitle")} subtitle={t("ptAdminAlertsSub")} />
      <main className="p-4 sm:p-8 space-y-6" dir="ltr">
        <Card>
          <p className="font-display font-semibold mb-4">Create Alert</p>
          <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >
              {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >
              {["Normal", "Moderate", "Severe", "Extreme"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface"
            >
              <option>Farmers + Public</option>
              <option>Farmers</option>
              <option>General Public</option>
            </select>
            <button type="submit" className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-light transition-colors">
              <Send size={15} /> Dispatch
            </button>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Alert message (will be sent in the recipient's chosen language — English or Urdu)"
              className="border border-line rounded-lg px-3 py-2 text-sm bg-surface md:col-span-4"
              rows={2}
            />
          </form>
        </Card>

        <Card>
          <p className="font-display font-semibold mb-4">Alert History</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-ink/40 border-b border-line">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">District</th>
                  <th className="pb-2 font-medium">Severity</th>
                  <th className="pb-2 font-medium">Message</th>
                  <th className="pb-2 font-medium">Audience</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                    <td className="py-2.5 font-mono text-xs text-ink/50">{a.id}</td>
                    <td className="py-2.5 font-medium">{a.district}</td>
                    <td className="py-2.5"><SeverityBadge level={a.severity} /></td>
                    <td className="py-2.5 text-ink/60 max-w-xs truncate">{a.message}</td>
                    <td className="py-2.5 text-ink/60">{a.sentTo}</td>
                    <td className="py-2.5 font-mono text-xs text-ink/50">{a.date}</td>
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
