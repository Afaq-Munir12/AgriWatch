import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { getDistricts } from "../services/droughtService";

function normalizeRows(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.districts)
      ? payload.districts
      : [];

  return rows
    .map((row) => {
      if (typeof row === "string") {
        return { district: row, province: "" };
      }

      return {
        district: row?.district || row?.name || "",
        province: row?.province || "",
      };
    })
    .filter((row) => row.district)
    .sort((a, b) => a.district.localeCompare(b.district));
}

export default function DistrictSearch() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const ref = useRef(null);

  const [districts, setDistricts] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urduClass = lang === "ur" ? "i18n-ur" : "";

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      try {
        setLoading(true);
        setError("");
        const payload = await getDistricts();
        if (!cancelled) setDistricts(normalizeRows(payload));
      } catch (err) {
        console.error("PDMA district search error:", err);
        if (!cancelled) {
          setDistricts([]);
          setError(err?.message || "Unable to load districts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDistricts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return districts.slice(0, 8);

    return districts
      .filter((item) => {
        const district = item.district.toLowerCase();
        const province = item.province.toLowerCase();
        return district.includes(term) || province.includes(term);
      })
      .slice(0, 8);
  }, [districts, query]);

  useEffect(() => setActiveIndex(0), [query]);

  function openDistrict(item) {
    navigate(`/pdma/district/${encodeURIComponent(item.district)}`);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event) {
    if (!open) return;

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      openDistrict(results[activeIndex]);
    }
  }

  return (
    <div data-tour="district-search" className="relative hidden md:block" ref={ref}>
      <div className="flex items-center gap-2 bg-surface border border-line rounded-lg px-3 py-2 w-64 focus-within:border-primary transition-colors">
        {loading ? (
          <LoaderCircle size={15} className="text-primary shrink-0 animate-spin" />
        ) : (
          <Search size={15} className="text-ink/40 shrink-0" />
        )}

        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("searchDistrict")}
          dir={lang === "ur" ? "rtl" : undefined}
          className={`bg-transparent outline-none text-sm w-full placeholder:text-ink/30 ${urduClass}`}
          disabled={loading}
          aria-label="Search real ML districts"
        />
      </div>

      {open && !loading && !error && results.length > 0 && (
        <div className="dropdown-panel absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-line text-[11px] uppercase tracking-wide text-ink/35">
            {query.trim() ? "Matching ML districts" : `${districts.length} monitored districts`}
          </div>

          {results.map((item, index) => (
            <button
              key={`${item.province}-${item.district}`}
              onClick={() => openDistrict(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                index === activeIndex ? "bg-paper-dim" : "hover:bg-paper-dim/60"
              }`}
            >
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin size={13} className="text-primary" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium text-ink">{item.district}</span>
                <span className="block truncate text-[11px] text-ink/40">{item.province || "Pakistan"}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wide text-primary/70">View</span>
            </button>
          ))}
        </div>
      )}

      {open && !loading && error && (
        <div className="dropdown-panel absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-xl z-50 px-3 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {open && !loading && !error && query.trim() && results.length === 0 && (
        <div className="dropdown-panel absolute right-0 mt-2 w-80 bg-surface border border-line rounded-xl shadow-xl z-50 px-3 py-3 text-sm text-ink/45">
          No ML district matches “{query}”.
        </div>
      )}
    </div>
  );
}
