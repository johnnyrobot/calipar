"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { upsertActionPlan } from "@/lib/db/repository";
import type { ActionPlan, ActionPlanStatus } from "@/lib/domain/types";

const statusLabels: Record<ActionPlanStatus, string> = {
  not_started: "Not started",
  ongoing: "Ongoing",
  complete: "Complete",
  institutionalized: "Institutionalized",
};

export default function PlanningPage() {
  const { state } = useWorkspace();
  const data = state.status === "ready" ? state.data : null;
  const derived = state.status === "ready" ? state.derived : null;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("Program Review Lead");
  const [equity, setEquity] = useState(false);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  if (!data || !derived) return null;
  const workingReview = derived.workingReview;
  const initiative = data.strategicInitiatives[0];

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workingReview || !initiative) return;
    const now = new Date().toISOString();
    try {
      await upsertActionPlan({
        id: crypto.randomUUID(),
        reviewId: workingReview.id,
        organizationId: workingReview.organizationId,
        initiativeId: initiative.id,
        title,
        description,
        owner,
        dueDate: "2027-06-30",
        status: "not_started",
        addressesEquityGap: equity,
        equityJustification: justification,
        revision: 0,
        createdAt: now,
        updatedAt: now,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setJustification("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action plan could not be created.");
    }
  };

  const advance = async (plan: ActionPlan) => {
    const sequence: ActionPlanStatus[] = ["not_started", "ongoing", "complete", "institutionalized"];
    const next = sequence[Math.min(sequence.indexOf(plan.status) + 1, sequence.length - 1)]!;
    await upsertActionPlan({ ...plan, status: next }, plan.revision);
  };

  return (
    <div>
      <PageHeading
        eyebrow="INTEGRATED PLANNING"
        title="Turn findings into motion"
        description="Keep improvement work connected to review evidence, strategic direction, ownership, and time."
        actions={<button className="button button-primary" type="button" onClick={() => setOpen(true)}><Icon name="plus" /> Add action plan</button>}
      />
      <section className="planning-overview">
        <div><span>{derived.totalActionPlans}</span><p>plans connected to review findings</p></div>
        <div><span>{derived.plansByStatus.ongoing.length}</span><p>currently in motion</p></div>
        <div><span>{derived.equityGapPlanCount}</span><p>explicitly address an equity gap</p></div>
      </section>
      <div className="plan-board" aria-label="Action plans by status">
        {(["not_started", "ongoing", "complete", "institutionalized"] as ActionPlanStatus[]).map((status) => {
          const plans = derived.plansByStatus[status];
          return (
          <section className="plan-column" key={status}>
            <header><span className={`status-dot ${status}`} /><h2>{statusLabels[status]}</h2><em>{plans.length}</em></header>
            <div>
              {plans.map((plan) => {
                const initiativeItem = data.strategicInitiatives.find((item) => item.id === plan.initiativeId);
                return (
                  <article className="plan-card" key={plan.id}>
                    <span className="tag">Goal {initiativeItem?.goalNumber ?? "—"}</span>
                    <h3>{plan.title}</h3>
                    <p>{plan.description}</p>
                    {plan.addressesEquityGap ? <span className="equity-tag"><Icon name="compass" /> Equity-focused</span> : null}
                    <div className="plan-card-foot"><span>{plan.owner}</span>{status !== "institutionalized" ? <button type="button" onClick={() => void advance(plan)}>Advance <Icon name="arrow" /></button> : <Icon name="check" />}</div>
                  </article>
                );
              })}
              {plans.length === 0 ? <p className="column-empty">No plans here yet.</p> : null}
            </div>
          </section>
          );
        })}
      </div>
      <Modal open={open} title="Add an action plan" description="Connect a specific next step to a program review and institutional goal." onClose={() => setOpen(false)}>
        <form onSubmit={create}>
          <div className="form-grid">
            <label className="field field-wide"><span>Action title</span><input required maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field field-wide"><span>What will change?</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label className="field"><span>Owner</span><input required value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
            <label className="field"><span>Strategic connection</span><select disabled><option>Goal {initiative?.goalNumber}: {initiative?.title}</option></select></label>
            <label className="check-field field-wide"><input type="checkbox" checked={equity} onChange={(event) => setEquity(event.target.checked)} /><span><strong>This plan addresses an equity gap</strong><small>Describe the gap and why this response is appropriate.</small></span></label>
            {equity ? <label className="field field-wide"><span>Equity justification</span><textarea required value={justification} onChange={(event) => setJustification(event.target.value)} /></label> : null}
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions"><button className="button button-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" type="submit">Create action plan</button></div>
        </form>
      </Modal>
    </div>
  );
}
