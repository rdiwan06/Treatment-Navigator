import { useState } from "react";
import TrialCard from "./TrialCard";

export default function DrugCard({ drug, condition }) {
  const [trials, setTrials] = useState(null);      // null = not loaded yet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchTrials() {
    if (trials !== null) return; // already loaded
    setLoading(true);
    setError(null);
    try {
      // Extract just the first word of the drug name for the search term
      // e.g. "Metformin (Glucophage)" → "Metformin"
      const drugSearchTerm = drug.name.split(/[\s(]/)[0];

      const params = new URLSearchParams({
        "query.cond": condition,
        "query.term": drugSearchTerm,
        "filter.overallStatus": "RECRUITING,ACTIVE_NOT_RECRUITING",
        pageSize: 5,
        format: "json",
      });

      const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${params}`);
      if (!res.ok) throw new Error("ClinicalTrials API error");
      const json = await res.json();
      setTrials(json.studies || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
        background: "#fff",
      }}
    >
      {/* Drug header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{drug.name}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 4, lineHeight: 1.5 }}>{drug.desc}</div>
        </div>
        <span
          style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
            background: "#e6f9f0", color: "#1a7a4a", fontWeight: 600, flexShrink: 0,
          }}
        >
          {drug.tag}
        </span>
      </div>

      {/* Button to load trials */}
      {trials === null && (
        <button
          onClick={fetchTrials}
          disabled={loading}
          style={{
            marginTop: 10, width: "100%", padding: "7px 12px",
            borderRadius: 8, border: "1px solid #ddd", background: "transparent",
            color: "#555", fontSize: 12, cursor: "pointer", textAlign: "left",
          }}
        >
          {loading ? "Searching ClinicalTrials.gov…" : `🔬 Find clinical trials for ${drug.name.split(/[\s(]/)[0]} →`}
        </button>
      )}

      {error && <p style={{ fontSize: 12, color: "#c0392b", marginTop: 8 }}>Error: {error}</p>}

      {/* Trial results */}
      {trials !== null && (
        <div style={{ marginTop: 10, borderTop: "1px solid #f0f0f0", paddingTop: 10 }}>
          {trials.length === 0 ? (
            <p style={{ fontSize: 12, color: "#888" }}>
              No active trials found right now. Check{" "}
              <a href="https://clinicaltrials.gov" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                clinicaltrials.gov
              </a>{" "}
              directly.
            </p>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {trials.length} matching trials
              </div>
              {trials.map((study, i) => (
                <TrialCard key={i} study={study} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
