import { usePaperclipStore } from "../../networking/sync/paperclipStore";

export function CompanySwitcher() {
  const connected = usePaperclipStore((s) => s.connected);
  const companies = usePaperclipStore((s) => s.companies);
  const company = usePaperclipStore((s) => s.company);
  const setActiveCompany = usePaperclipStore((s) => s.setActiveCompany);
  const fetchCompanies = usePaperclipStore((s) => s.fetchCompanies);

  return (
    <div className="company-switcher">
      <label className="cs-label">COMPANY</label>
      <select
        className="cs-select"
        value={company?.id ?? ""}
        disabled={!connected || companies.length === 0}
        onChange={(e) => {
          const id = e.target.value;
          if (id) setActiveCompany(id);
        }}
      >
        {companies.length === 0 && <option value="">— none —</option>}
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        className="cs-refresh"
        title="Refresh companies"
        disabled={!connected}
        onClick={() => fetchCompanies()}
      >
        ⟳
      </button>
    </div>
  );
}
