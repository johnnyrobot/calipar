"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { formatPercent, percentWidth } from "@/lib/utils/format";

export default function DataPage() {
  const { state } = useWorkspace();
  const derived = state.status === "ready" ? state.derived : null;
  const programs = derived?.programs ?? [];
  const [programId, setProgramId] = useState("");
  const selectedId = programId || programs[0]?.id || "";
  const rows = derived?.analyticsByProgram[selectedId] ?? [];
  if (!derived) return null;
  const latest = rows.at(-1);
  const maxEnrollment = Math.max(1, ...rows.map((row) => row.enrollment));

  const downloadCsv = () => {
    // Counts, not rates: a reader can recompute a rate from these, but cannot
    // recover a denominator from a rounded percentage.
    const columns = [
      "academicYear",
      "enrollment",
      "completions",
      "successfulEnrollments",
      "attemptedEnrollments",
      "equityGroupSuccessful",
      "equityGroupAttempted",
      "sloMet",
      "sloAssessed",
    ];
    const body = rows.map((row) => [
      row.academicYear,
      row.enrollment,
      row.completions,
      row.successfulEnrollments,
      row.attemptedEnrollments,
      row.equityGroupSuccessful,
      row.equityGroupAttempted,
      row.sloMet,
      row.sloAssessed,
    ].join(","));
    const blob = new Blob([[columns.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "calipar-demo-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeading
        eyebrow="DATA & OUTCOMES · SYNTHETIC"
        title="Read the signal"
        description="Explore aggregate demonstration evidence before deciding what it means for the program."
        actions={<button className="button button-ghost" type="button" onClick={downloadCsv}><Icon name="download" /> Export CSV</button>}
      />
      <div className="data-toolbar">
        <label className="field">
          <span>Program lens</span>
          <select value={selectedId} onChange={(event) => setProgramId(event.target.value)}>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </label>
        <p><Icon name="warning" /> Synthetic aggregate fixtures for demonstration only</p>
      </div>
      <section className="outcome-grid" aria-label="Latest outcome indicators">
        {[
          ["Enrollment", latest?.enrollment.toLocaleString() ?? "—", "Headcount"],
          [
            "Course success",
            latest ? formatPercent(latest.successfulEnrollments, latest.attemptedEnrollments) : "—",
            latest ? `${latest.successfulEnrollments.toLocaleString()} of ${latest.attemptedEnrollments.toLocaleString()} attempted` : "Successful / attempted",
          ],
          [
            "Completion ratio",
            latest ? formatPercent(latest.completions, latest.enrollment) : "—",
            latest ? `${latest.completions.toLocaleString()} of ${latest.enrollment.toLocaleString()} enrolled` : "Awards / enrollment",
          ],
          [
            "SLO attainment",
            latest ? formatPercent(latest.sloMet, latest.sloAssessed) : "—",
            latest ? `${latest.sloMet.toLocaleString()} of ${latest.sloAssessed.toLocaleString()} assessed` : "Met / assessed",
          ],
        ].map(([label, value, note]) => (
          <article className="stat-card" key={label}><span className="stat-label">{label}</span><strong>{value}</strong><p>{note}</p></article>
        ))}
      </section>
      <section className="data-grid">
        <div className="panel">
          <div className="panel-head"><div><p className="eyebrow">FIVE-YEAR VIEW</p><h2>Enrollment and course success</h2></div></div>
          <div className="bar-chart" aria-hidden="true">
            {rows.map((row) => {
              return (
                <div key={row.id}>
                  <div className="bar-pair">
                    <i className="enrollment-bar" style={{ height: `${Math.max(12, row.enrollment / maxEnrollment * 100)}%` }} />
                    <i className="success-bar" style={{ height: `max(12%, ${percentWidth(row.successfulEnrollments, row.attemptedEnrollments)})` }} />
                  </div>
                  <span>{row.academicYear.slice(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="chart-legend"><span><i className="legend-enrollment" /> Enrollment</span><span><i className="legend-success" /> Course success %</span></div>
        </div>
        <aside className="panel equity-card">
          <p className="eyebrow">EQUITY LENS</p>
          <h2>{latest?.equityGroup ?? "Focus group"}</h2>
          <strong>{latest ? formatPercent(latest.equityGroupSuccessful, latest.equityGroupAttempted) : "—"}</strong>
          <p>Latest synthetic course-success rate for the selected equity group.</p>
          <div className="equity-note"><Icon name="compass" /><span>Use this as a starting point for inquiry, not a conclusion about students.</span></div>
        </aside>
      </section>
      <section className="panel data-table-panel">
        <div className="panel-head"><div><p className="eyebrow">ACCESSIBLE DATA TABLE</p><h2>Outcome detail</h2></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Academic year</th><th>Enrollment</th><th>Completions</th><th>Course success</th><th>Equity group success</th><th>SLO attainment</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}><td>{row.academicYear}</td><td>{row.enrollment.toLocaleString()}</td><td>{row.completions.toLocaleString()}</td><td>{formatPercent(row.successfulEnrollments, row.attemptedEnrollments)}</td><td>{formatPercent(row.equityGroupSuccessful, row.equityGroupAttempted)}</td><td>{formatPercent(row.sloMet, row.sloAssessed)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
