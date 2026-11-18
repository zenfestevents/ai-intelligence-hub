"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, CheckCheck, LogOut, RotateCcw, Search } from "lucide-react";
import SOURCE_LIST from "@/lib/sources.json";

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
  { id: "read", label: "Read" },
  { id: "verticals", label: "Verticals" },
  { id: "github", label: "GitHub trending" },
  { id: "huggingface", label: "Hugging Face trending" },
  { id: "startups", label: "Startups" },
  { id: "queue", label: "Waiting queue" },
  { id: "sources", label: "Sources" },
];
// Must match the source labels in backend/feeds.py.
const GITHUB_SOURCE = "GitHub Trending (RSSHub)";
const HF_SOURCE = "Hugging Face Trending Models";
const STARTUPS_PAGE = 60;
const INTEL_PAGE = 60;
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

function fullDate(iso) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

function IntelCard({ item, onToggleRead }) {
  const isRead = Boolean(item.read_at);
  return (
    <article className="cell flex flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-4">
        <p className="label text-phosphor">{item.entity_name}</p>
        <p className="label shrink-0 text-right" title={`The source published this on ${fullDate(item.published_at)}`}>
          Published <time dateTime={item.published_at}>{timeAgo(item.published_at)}</time>
          {isRead && (
            <span className="block" title={fullDate(item.read_at)}>
              Read {timeAgo(item.read_at)}
            </span>
          )}
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
      {onToggleRead && (
        <button
          type="button"
          onClick={() => onToggleRead([item.id], !isRead)}
          className="flex items-center justify-center gap-1.5 border border-line px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-dim hover:border-phosphor hover:text-phosphor"
        >
          {isRead ? (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isRead ? "Move back to unread" : "Mark as read"}
        </button>
      )}
    </article>
  );
}

function IntelGrid({ state, emptyHint, readView = false }) {
  if (state.error) {
    return (
      <Notice title="Cannot reach the API" alert>
        The dashboard could not load data ({state.error}). Reload the page; if it keeps failing, the database may
        be down.
      </Notice>
    );
  }
  if (state.loading && state.items.length === 0) {
    return <Notice title="Loading" />;
  }
  if (state.items.length === 0) {
    return <Notice title="Nothing here yet">{emptyHint}</Notice>;
  }
  const shown = state.items.length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label">
          {shown} of {state.total} {readView ? "read" : "unread"} shown
        </p>
        {!readView && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Mark these ${shown} items as read?`)) {
                state.toggleRead(state.items.map((i) => i.id), true);
              }
            }}
            className="flex items-center gap-1.5 border border-line px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-dim hover:border-phosphor hover:text-phosphor"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Mark all {shown} shown as read
          </button>
        )}
      </div>
      <div className="gridlines md:grid-cols-2 2xl:grid-cols-3">
        {state.items.map((item) => (
          <IntelCard key={item.id} item={item} onToggleRead={state.toggleRead} />
        ))}
      </div>
      {shown < state.total && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={state.loadMore}
            disabled={state.loading}
            className="border border-phosphor px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-phosphor hover:bg-phosphor hover:text-crt disabled:opacity-50"
          >
            {state.loading ? "Loading" : `Load more (${state.total - shown} left)`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- data hooks ---------- */

// read: "0" = unread items, "1" = read items. onChanged runs after items are marked (to refresh the counters).
function useIntel(param, value, active, read, onChanged) {
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: null });
  const [count, setCount] = useState(INTEL_PAGE);

  // Back to the first page when the filter changes.
  useEffect(() => setCount(INTEL_PAGE), [param, value, read]);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ limit: String(count), read });
    if (value !== "All") qs.set(param, value);
    try {
      const { items, total } = await getJson(`/api/intel?${qs}`);
      setState({ items, total, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [param, value, read, count]);

  useEffect(() => {
    if (!active) return undefined;
    setState((s) => ({ ...s, loading: true }));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, active]);

  const loadMore = () => setCount((n) => Math.min(1000, n + INTEL_PAGE));

  // The items leave this list at once, then the list and counters reload from the database.
  const toggleRead = async (ids, makeRead) => {
    const gone = new Set(ids);
    setState((s) => ({
      ...s,
      items: s.items.filter((i) => !gone.has(i.id)),
      total: Math.max(0, s.total - ids.length),
    }));
    try {
      await postJson("/api/read", { ids, read: makeRead });
    } catch (err) {
      setState((s) => ({ ...s, error: err.message }));
    }
    load();
    onChanged?.();
  };

  return { ...state, loadMore, toggleRead };
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

/* ---------- waiting queue tab ---------- */

const QUEUE_PAGE = 100;

function QueueTab() {
  const [source, setSource] = useState("All");
  const [limit, setLimit] = useState(QUEUE_PAGE);
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (source !== "All") qs.set("source", source);
    try {
      const data = await getJson(`/api/queue?${qs}`);
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, [source, limit]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const pick = (value) => {
    setSource(value);
    setLimit(QUEUE_PAGE);
  };

  if (state.error) {
    return (
      <Notice title="Cannot reach the API" alert>
        The waiting queue could not load ({state.error}).
      </Notice>
    );
  }
  const data = state.data;
  if (!data) return <Notice title="Loading" />;
  if (data.waiting === 0) {
    return <Notice title="Queue is empty">Every fetched article has been summarised or rejected.</Notice>;
  }

  const shownTotal = source === "All" ? data.waiting : data.sources.find((s) => s.source === source)?.count ?? 0;
  const summary = [
    ["Waiting", data.waiting],
    ["Sources waiting", data.sources.length],
    ["Published in last 24h", data.last_24h],
    ["Stuck (3 failed tries)", data.stuck, data.stuck > 0],
    ["Oldest item", timeAgo(data.oldest)],
  ];

  return (
    <div className="space-y-8">
      <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
        Articles a scan has collected that the Claude summary step has not handled yet. They are not verified and
        have no summary. Open the source to read one. Pick a source to see only its items.
      </p>

      <dl className="gridlines grid-cols-2 md:grid-cols-5" aria-label="Queue status">
        {summary.map(([name, value, warn]) => (
          <div key={name} className="cell p-4">
            <dt className="label">{name}</dt>
            <dd className={`mt-1 text-xl font-bold uppercase ${warn ? "text-hazard" : "text-phosphor"}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h2 className="label mb-3">By source</h2>
        <div className="gridlines grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[{ source: "All", count: data.waiting, newest: null }, ...data.sources].map((s) => {
            const active = source === s.source;
            return (
              <button
                key={s.source}
                type="button"
                aria-pressed={active}
                onClick={() => pick(s.source)}
                className={`cell flex min-w-0 items-center justify-between gap-3 p-3 text-left transition-colors ${
                  active ? "bg-phosphor text-crt" : "text-phosphor hover:text-hazard"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12px] uppercase tracking-[0.06em]">
                    {s.source === "All" ? "All sources" : s.source}
                  </span>
                  {s.newest && (
                    <span className={`block text-[11px] ${active ? "text-crt" : "text-dim"}`}>
                      newest {timeAgo(s.newest)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-lg font-bold">{s.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="label mb-3">
          {source === "All" ? "All sources" : source}, newest first ({Math.min(data.items.length, shownTotal)} of{" "}
          {shownTotal})
        </h2>
        <ol className="gridlines">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="cell grid gap-x-6 gap-y-1 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_6rem]"
            >
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 break-words text-[13px] leading-snug text-phosphor underline decoration-line underline-offset-4 hover:text-hazard hover:decoration-hazard"
              >
                {item.title || hostOf(item.source_url)}
              </a>
              <p className="label truncate">{item.source_label}</p>
              <p className="label md:text-right">
                <time dateTime={item.published_at}>{timeAgo(item.published_at)}</time>
                {item.attempts > 0 && <span className="ml-2 text-hazard">try {item.attempts}</span>}
              </p>
            </li>
          ))}
        </ol>
        {data.items.length < shownTotal && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setLimit((n) => Math.min(500, n + QUEUE_PAGE))}
              disabled={state.loading || limit >= 500}
              className="border border-phosphor px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-phosphor hover:bg-phosphor hover:text-crt disabled:opacity-50"
            >
              {state.loading ? "Loading" : "Show more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- sources tab ---------- */

function SourcesTab() {
  const [state, setState] = useState({ sources: null, error: null });
  const [showOff, setShowOff] = useState(false);

  useEffect(() => {
    getJson("/api/sources")
      .then((sources) => setState({ sources, error: null }))
      .catch((err) => setState({ sources: null, error: err.message }));
  }, []);

  if (state.error) {
    return (
      <Notice title="Cannot reach the API" alert>
        The source list could not load ({state.error}).
      </Notice>
    );
  }
  // Show the bundled list straight away; counts fill in when the API answers.
  const sources = state.sources ?? SOURCE_LIST;
  const on = sources.filter((s) => s.enabled);
  const off = sources.filter((s) => !s.enabled);
  const groups = [...new Set(on.map((s) => s.group))];
  const feedsOn = on.filter((s) => s.group !== "X accounts").length;
  const xCount = on.length - feedsOn;

  const row = (s) => (
    <li
      key={s.label}
      className="cell grid gap-x-6 gap-y-1 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_repeat(3,5.5rem)]"
    >
      <div className="min-w-0">
        <p className="text-[13px] text-phosphor">{s.label}</p>
        {s.note && <p className="text-[11px] leading-snug text-dim">{s.note}</p>}
      </div>
      <p className="label truncate">
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-hazard">
            {s.host}
          </a>
        ) : (
          s.host
        )}
      </p>
      <p className="label md:text-right" title="Articles from this source on the site">
        <span className="md:hidden">Published </span>
        <span className="text-phosphor">{s.published ?? "-"}</span>
      </p>
      <p className="label md:text-right" title="Of those, not read yet">
        <span className="md:hidden">Unread </span>
        <span className="text-phosphor">{s.unread ?? "-"}</span>
      </p>
      <p className="label md:text-right" title={s.newest ? `Newest article published ${fullDate(s.newest)}` : ""}>
        {s.newest ? timeAgo(s.newest) : "none yet"}
      </p>
    </li>
  );

  return (
    <div className="space-y-8">
      <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
        Every source a scan reads: {feedsOn} feeds and {xCount} X accounts, grouped by type. Published is how many
        of its articles are on the site, Unread how many of those you haven&rsquo;t marked read, and the last column
        when its newest article came out. The list comes from <code>backend/feeds.py</code>.
      </p>
      <div className="label hidden gap-x-6 px-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_repeat(3,5.5rem)]">
        <span>Source</span>
        <span>Site</span>
        <span className="text-right">Published</span>
        <span className="text-right">Unread</span>
        <span className="text-right">Newest</span>
      </div>
      {groups.map((g) => {
        const list = on.filter((s) => s.group === g);
        return (
          <div key={g}>
            <h2 className="label mb-3">
              {g} ({list.length})
            </h2>
            <ol className="gridlines">{list.map(row)}</ol>
          </div>
        );
      })}
      {off.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOff((v) => !v)}
            aria-expanded={showOff}
            className="label mb-3 hover:text-phosphor"
          >
            {showOff ? "Hide" : "Show"} {off.length} sources that are switched off
          </button>
          {showOff && <ol className="gridlines opacity-70">{off.map(row)}</ol>}
        </div>
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

  const loadStats = useCallback(() => {
    getJson("/api/stats")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const feed = useIntel("category", category, tab === "feed", "0", loadStats);
  const readItems = useIntel("category", "All", tab === "read", "1", loadStats);
  const verticals = useIntel("industry", industry, tab === "verticals", "0", loadStats);
  const github = useIntel("source", GITHUB_SOURCE, tab === "github", "0", loadStats);
  const huggingface = useIntel("source", HF_SOURCE, tab === "huggingface", "0", loadStats);

  useEffect(() => {
    loadStats();
    const timer = setInterval(loadStats, REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadStats]);

  const signOut = async () => {
    await fetch("/api/login", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  };

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

  // [name, value, explanation shown on hover and under the number]
  const telemetry = [
    ["Unread", stats?.unread_total ?? "-", "Articles on the site you haven't marked as read yet."],
    ["Read", stats?.read_total ?? "-", "Articles you marked as read. They're in the Read tab."],
    ["Added 24h", stats?.verified_last_24h ?? "-", "Articles added to the site in the last 24 hours."],
    ["On the site", stats?.verified_total ?? "-", "All articles that passed the exact-quote check (unread + read)."],
    ["Waiting", stats?.waiting_total ?? "-", "Collected by a scan but not summarised yet. See the Waiting queue tab."],
    ["Rejected", stats?.rejected_total ?? "-", "Dropped by the summary step: not about AI, or the quote wasn't found."],
    [
      "Sources",
      stats?.sources_enabled ?? "-",
      `Feeds a scan reads${stats ? `, plus ${stats.x_accounts} X accounts` : ""}. See the Sources tab.`,
    ],
    [
      "Last update",
      stats ? timeAgo(stats.last_update_at) : "-",
      "Last time a scan or a summary run wrote anything. Scans run only when you ask for one.",
    ],
  ];
  const unread = stats?.unread_total;

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-4 pb-16 pt-6 md:px-8">
      <header className="border-b-2 border-phosphor pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="label">AetherAI / Intelligence unit / Rev 1.0</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("feed")}
              title="Articles you haven't marked as read. Opens the Live feed."
              className="border border-hazard bg-hazard px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-phosphor hover:bg-transparent"
            >
              {unread ?? "-"} to read
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              aria-label="Sign out"
              className="border border-line p-2 text-dim hover:border-phosphor hover:text-phosphor"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
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

      <dl className="gridlines mt-6 grid-cols-2 md:grid-cols-4 xl:grid-cols-8" aria-label="System status">
        {telemetry.map(([name, value, help]) => (
          <div key={name} className="cell p-4" title={help}>
            <dt className="label">{name}</dt>
            <dd className={`mt-1 text-xl font-bold uppercase ${!stats ? "text-hazard" : "text-phosphor"}`}>{value}</dd>
            <dd className="mt-1 text-[10px] leading-snug text-dim">{help}</dd>
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
              <span className="mr-2 text-dim">{String(i + 1).padStart(2, "0")}</span>
              {t.label}
              {t.id === "feed" && unread > 0 && (
                <span className="ml-2 bg-hazard px-1.5 py-0.5 text-[10px] font-bold text-phosphor">{unread}</span>
              )}
              {t.id === "read" && stats?.read_total > 0 && (
                <span className="ml-2 text-dim">({stats.read_total})</span>
              )}
            </button>
          );
        })}
      </div>

      <main className="mt-8">
        {tab === "feed" && (
          <section id="panel-feed" role="tabpanel" aria-labelledby="tab-feed" className="space-y-6">
            <FilterBar label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
              Everything on the site you haven&rsquo;t read yet, from every source (GitHub and Hugging Face trending
              included), newest first. The time on each card is when the source published it. Mark an item as read
              and it moves to the Read tab.
            </p>
            <IntelGrid
              state={feed}
              emptyHint={
                category === "All"
                  ? "You're all caught up: nothing unread. New items appear here after the next scan and summary run."
                  : `Nothing unread in "${category}". Try another category.`
              }
            />
          </section>
        )}

        {tab === "read" && (
          <section id="panel-read" role="tabpanel" aria-labelledby="tab-read" className="space-y-6">
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
              Items you marked as read, most recently read first. &ldquo;Move back to unread&rdquo; returns one to the
              Live feed.
            </p>
            <IntelGrid state={readItems} readView emptyHint="Nothing marked as read yet." />
          </section>
        )}

        {tab === "sources" && (
          <section id="panel-sources" role="tabpanel" aria-labelledby="tab-sources">
            <SourcesTab />
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

        {tab === "github" && (
          <section id="panel-github" role="tabpanel" aria-labelledby="tab-github" className="space-y-6">
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
              Repositories from GitHub&rsquo;s daily trending list, newest first. Every trending repository is
              shown here, whether or not it is about AI.
            </p>
            <IntelGrid
              state={github}
              emptyHint="No trending repository has been summarised yet. They appear after the next summary run."
            />
          </section>
        )}

        {tab === "huggingface" && (
          <section id="panel-huggingface" role="tabpanel" aria-labelledby="tab-huggingface" className="space-y-6">
            <p className="max-w-[70ch] text-[13px] leading-relaxed text-dim">
              Models from Hugging Face&rsquo;s trending list, newest first. Every model type is included:
              text, image, video, audio, 3D and multimodal.
            </p>
            <IntelGrid
              state={huggingface}
              emptyHint="No trending model has been summarised yet. They appear after the next summary run."
            />
          </section>
        )}

        {tab === "startups" && (
          <section id="panel-startups" role="tabpanel" aria-labelledby="tab-startups">
            <StartupsTab />
          </section>
        )}

        {tab === "queue" && (
          <section id="panel-queue" role="tabpanel" aria-labelledby="tab-queue">
            <QueueTab />
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
