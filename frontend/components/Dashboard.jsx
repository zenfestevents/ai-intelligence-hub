"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Search } from "lucide-react";

const CATEGORIES = [
  "All",
  "Model Release",
  "Developer Tool",
  "Research Paper",
  "Hardware/Chips",
  "Startup Funding",
  "Product Update",
  "Guides & Education",
  "Industry News",
];
const INDUSTRIES = [
  "All",
  "General",
  "Medicine & Healthcare",
  "Filmmaking & Media",
  "Agriculture",
  "Space & Robotics",
  "Education",
  "Enterprise",
];
const TABS = [
  { id: "feed", label: "Live feed" },
  { id: "verticals", label: "Verticals" },
  { id: "startups", label: "Startups" },
];
const STARTUPS_PAGE = 60;
const REFRESH_MS = 60000;

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function timeAgo(iso) {
  if (!iso) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ---------- small building blocks ---------- */

function FilterBar({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2" role="group" aria-label={label}>
      <span className="label mr-3">{label}</span>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              active
                ? "border-phosphor bg-phosphor text-crt"
                : "border-line text-dim hover:border-phosphor hover:text-phosphor"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function Notice({ title, children, alert = false }) {
  return (
    <div className={`border p-6 ${alert ? "border-hazard" : "border-line"}`} role={alert ? "alert" : "status"}>
      <p className={`text-xs uppercase tracking-[0.1em] ${alert ? "text-hazard" : "text-phosphor"}`}>{title}</p>
      {children && <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-dim">{children}</p>}
    </div>
  );
}

function IntelCard({ item }) {
  return (
    <article className="cell flex flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-4">
        <p className="label text-phosphor">{item.entity_name}</p>
        <p className="label shrink-0 text-right">
          <time dateTime={item.published_at}>{timeAgo(item.published_at)}</time>
        </p>
      </header>

      <h3 className="text-[17px] font-bold leading-snug text-phosphor">{item.title}</h3>
      <p className="text-[13px] leading-relaxed text-dim">{item.summary}</p>

      <figure className="border-l-2 border-signal pl-3">
        <figcaption className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-signal">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Quote found in source
        </figcaption>
        <blockquote className="text-[13px] leading-relaxed text-phosphor">
          &ldquo;{item.exact_source_quote}&rdquo;
        </blockquote>
      </figure>

      <footer className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3">
        <p className="label">
          {item.primary_category} / {item.industry_tag} / {item.country_of_origin || "Global"}
        </p>
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-phosphor underline decoration-hazard decoration-2 underline-offset-4 hover:text-hazard"
        >
          {hostOf(item.source_url)}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </footer>
    </article>
  );
}

function IntelGrid({ state, emptyHint }) {
  if (state.error) {
    return (
      <Notice title="Cannot reach the API" alert>
        The dashboard could not load data ({state.error}). Check that the backend is running on port 8000.
      </Notice>
    );
  }
  if (state.loading && state.items.length === 0) {
    return <Notice title="Loading" />;
  }
  if (state.items.length === 0) {
    return <Notice title="Nothing here yet">{emptyHint}</Notice>;
  }
  return (
    <div className="gridlines md:grid-cols-2 2xl:grid-cols-3">
      {state.items.map((item) => (
        <IntelCard key={item.id} item={item} />
      ))}
    </div>
  );
}

/* ---------- data hooks ---------- */

function useIntel(param, value, active) {
  const [state, setState] = useState({ items: [], loading: true, error: null });

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ limit: "60" });
    if (value !== "All") qs.set(param, value);
    try {
      const items = await getJson(`/api/intel?${qs}`);
      setState({ items, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [param, value]);

  useEffect(() => {
    if (!active) return undefined;
    setState((s) => ({ ...s, loading: true }));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, active]);

  return state;
}

/* ---------- startups tab ---------- */

function StartupsTab() {
  const [facets, setFacets] = useState({ countries: [], industries: [] });
  const [country, setCountry] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [state, setState] = useState({ items: [], loading: true, error: null, hasMore: false });

  useEffect(() => {
    getJson("/api/startups/facets").then(setFacets).catch(() => {});
  }, []);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPage = useCallback(
    async (offset) => {
      const qs = new URLSearchParams({ limit: String(STARTUPS_PAGE), offset: String(offset) });
      if (country !== "All") qs.set("country", country);
      if (industry !== "All") qs.set("industry", industry);
      if (query) qs.set("q", query);
      return getJson(`/api/startups?${qs}`);
    },
    [country, industry, query]
  );

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetchPage(0)
      .then((items) => {
        if (!cancelled) setState({ items, loading: false, error: null, hasMore: items.length === STARTUPS_PAGE });
      })
      .catch((err) => {
        if (!cancelled) setState({ items: [], loading: false, error: err.message, hasMore: false });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const more = await fetchPage(state.items.length);
      setState((s) => ({
        items: [...s.items, ...more],
        loading: false,
        error: null,
        hasMore: more.length === STARTUPS_PAGE,
      }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  };

  const selectClass =
    "w-full border border-line bg-crt px-3 py-2 text-[12px] uppercase tracking-[0.06em] text-phosphor";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <label className="block">
          <span className="label mb-1.5 block">Search</span>
          <span className="flex items-center border border-line focus-within:border-phosphor">
            <Search className="ml-3 h-4 w-4 text-dim" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Company or keyword"
              className="w-full bg-transparent px-3 py-2 text-[13px] text-phosphor placeholder:text-dim focus:outline-none"
            />
          </span>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
            <option value="All">All countries</option>
            {facets.countries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Industry</span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={selectClass}>
            <option value="All">All industries</option>
            {facets.industries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value} ({c.count})
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error ? (
        <Notice title="Cannot reach the API" alert>
          The startup directory could not load ({state.error}). Check that the backend is running on port 8000.
        </Notice>
      ) : state.items.length === 0 && state.loading ? (
        <Notice title="Loading" />
      ) : state.items.length === 0 ? (
        <Notice title="No companies match">
          Clear the search or filters. If the directory is empty, the first sync from the public Y Combinator
          dataset may still be running.
        </Notice>
      ) : (
        <>
          <div className="gridlines">
            {state.items.map((s) => (
              <article
                key={s.id}
                className="cell grid gap-x-6 gap-y-2 p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,13rem)]"
              >
                <div>
                  <h3 className="text-[15px] font-bold text-phosphor">{s.company_name}</h3>
                  <a
                    href={s.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 break-all text-[11px] uppercase tracking-[0.06em] text-dim underline decoration-hazard underline-offset-4 hover:text-hazard"
                  >
                    {hostOf(s.website_url)}
                    <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
                <p className="line-clamp-3 text-[13px] leading-relaxed text-dim">{s.use_case_description}</p>
                <dl className="label space-y-1 md:text-right">
                  <div>
                    <dt className="sr-only">Country</dt>
                    <dd className="text-phosphor">{s.country}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Industry</dt>
                    <dd>{s.industry}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Batch</dt>
                    <dd>
                      <a
                        href={s.source_reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-hazard"
                      >
                        {s.batch_or_funding || "Source"}
                      </a>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="label">{state.items.length} shown</p>
            {state.hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={state.loading}
                className="border border-phosphor px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-phosphor hover:bg-phosphor hover:text-crt disabled:opacity-50"
              >
                {state.loading ? "Loading" : "Load more"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- page ---------- */

export default function Dashboard() {
  const [tab, setTab] = useState("feed");
  const [category, setCategory] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [stats, setStats] = useState(null);

  const feed = useIntel("category", category, tab === "feed");
  const verticals = useIntel("industry", industry, tab === "verticals");

  useEffect(() => {
    const load = () => getJson("/api/stats").then(setStats).catch(() => setStats(null));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    let next = null;
    if (e.key === "ArrowRight") next = TABS[(i + 1) % TABS.length];
    if (e.key === "ArrowLeft") next = TABS[(i - 1 + TABS.length) % TABS.length];
    if (next) {
      e.preventDefault();
      setTab(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    }
  };

  const telemetry = [
    ["Polling", stats ? (stats.polling_active ? "On" : "Off") : "No link", stats && !stats.polling_active],
    ["Verified 24h", stats?.verified_last_24h ?? "-"],
    ["Verified total", stats?.verified_total ?? "-"],
    ["Rejected", stats?.rejected_total ?? "-"],
    ["Sources", stats?.sources_enabled ?? "-"],
    ["Last poll", stats ? timeAgo(stats.last_poll_at) : "-"],
  ];

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 pb-16 pt-6 md:px-8">
      <header className="border-b-2 border-phosphor pb-6">
        <p className="label">AetherAI / Intelligence unit / Rev 1.0</p>
        <h1
          className="mt-3 font-display uppercase leading-[0.88] tracking-[-0.04em] text-phosphor"
          style={{ fontSize: "clamp(3rem, 11vw, 10rem)" }}
        >
          Radar<span className="text-hazard">.</span>
        </h1>
        <p className="mt-4 max-w-[62ch] text-[13px] leading-relaxed text-dim">
          AI news from primary sources. An item is published only if its quoted sentence is found, character for
          character, in the page it came from. That check is plain code, not a model.
        </p>
      </header>

      <dl className="gridlines mt-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-6" aria-label="System status">
        {telemetry.map(([name, value, warn]) => (
          <div key={name} className="cell p-4">
            <dt className="label">{name}</dt>
            <dd className={`mt-1 text-xl font-bold uppercase ${warn || !stats ? "text-hazard" : "text-phosphor"}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div
        role="tablist"
        aria-label="Sections"
        onKeyDown={onTabKey}
        className="mt-10 flex flex-wrap border-b border-line"
      >
        {TABS.map((t, i) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-xs uppercase tracking-[0.1em] transition-colors ${
                active ? "border-hazard text-phosphor" : "border-transparent text-dim hover:text-phosphor"
              }`}
            >
              <span className="mr-2 text-dim">0{i + 1}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      <main className="mt-8">
        {tab === "feed" && (
          <section id="panel-feed" role="tabpanel" aria-labelledby="tab-feed" className="space-y-6">
            <FilterBar label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <IntelGrid
              state={feed}
              emptyHint={
                category === "All"
                  ? "No item has passed verification yet. New items appear here as the poller works through the sources."
                  : `No verified items in "${category}" yet. Try another category.`
              }
            />
          </section>
        )}

        {tab === "verticals" && (
          <section id="panel-verticals" role="tabpanel" aria-labelledby="tab-verticals" className="space-y-6">
            <FilterBar label="Industry" options={INDUSTRIES} value={industry} onChange={setIndustry} />
            <IntelGrid
              state={verticals}
              emptyHint={
                industry === "All"
                  ? "No item has passed verification yet."
                  : `No verified items tagged "${industry}" yet. Try another industry.`
              }
            />
          </section>
        )}

        {tab === "startups" && (
          <section id="panel-startups" role="tabpanel" aria-labelledby="tab-startups">
            <StartupsTab />
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-line pt-4">
        <p className="label">
          The quote check confirms the quote exists in the source. Titles and summaries are written by a model:
          open the source before relying on them.
        </p>
      </footer>
    </div>
  );
}
