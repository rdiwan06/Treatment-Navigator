import { useState } from "react";

const STATUS_STYLES = {
  RECRUITING: { background: "#e6f9f0", color: "#1a7a4a" },
  ACTIVE_NOT_RECRUITING: { background: "#e8f0fe", color: "#1a56db" },
  default: { background: "#f0f0f0", color: "#666" },
};

export default function TrialCard({ study }) {
  const [open, setOpen] = useState(false);

  // Pull out the fields we need from the ClinicalTrials v2 API response
  const pm = study.protocolSection;
  const title = pm?.identificationModule?.briefTitle || "Untitled study";
  const nctId = pm?.identificationModule?.nctId || "";
  const status = pm?.statusModule?.overallStatus || "Unknown";
  const phase = pm?.designModule?.phases?.join(", ") || "—";
  const sponsor = pm?.sponsorCollaboratorsModule?.leadSponsor?.name || "—";
  const summary = (pm?.descriptionModule?.briefSummary || "—").slice(0, 250);
  const minAge = pm?.eligibilityModule?.minimumAge || "—";
  const maxAge = pm?.eligibilityModule?.maximumAge || "—";

  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.default;

  return (
    <div
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 8,
        marginBottom: 6,
        overflow: "hidden",
      }}
    >
      {/* Clickable header row */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px", cursor: "pointer",
          background: open ? "#f8f8f8" : "#fafafa",
        }}
      >
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>
          {title.length > 88 ? title.slice(0, 85) + "…" : title}
        </span>
        <span
          style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 20,
            fontWeight: 600, whiteSpace: "nowrap", ...statusStyle,
          }}
        >
          {status}
        </span>
        <span style={{ fontSize: 10, color: "#aaa", marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Expanded detail rows */}
      {open && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: "#555", lineHeight: 1.7, borderTop: "1px solid #f0f0f0" }}>
          <Row label="NCT ID">
            <a
              href={`https://clinicaltrials.gov/study/${nctId}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2563eb" }}
            >
              {nctId}
            </a>
          </Row>
          <Row label="Phase">{phase}</Row>
          <Row label="Sponsor">{sponsor}</Row>
          <Row label="Age range">{minAge} – {maxAge}</Row>
          <Row label="Summary">{summary}{summary.length >= 250 ? "…" : ""}</Row>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
      <span style={{ color: "#aaa", minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
