"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { deleteResourceRequest, upsertResourceRequest } from "@/lib/db/repository";
import type { ObjectCodeSeries, ResourceRequest } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/utils/format";

export default function ResourcesPage() {
  const { state } = useWorkspace();
  const data = state.status === "ready" ? state.data : null;
  const derived = state.status === "ready" ? state.derived : null;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [amount, setAmount] = useState("5000");
  const [code, setCode] = useState<ObjectCodeSeries>("4000");
  const [error, setError] = useState("");
  const [deleteItem, setDeleteItem] = useState<ResourceRequest | null>(null);
  if (!data || !derived) return null;
  const review = derived.workingReview;

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!review) return;
    const now = new Date().toISOString();
    try {
      await upsertResourceRequest({
        id: crypto.randomUUID(),
        reviewId: review.id,
        actionPlanId: data.actionPlans.find((plan) => plan.reviewId === review.id)?.id ?? null,
        organizationId: review.organizationId,
        title,
        rationale,
        objectCodeSeries: code,
        amountCents: Math.round(Number(amount) * 100),
        priority: data.resourceRequests.length + 1,
        status: "requested",
        revision: 0,
        createdAt: now,
        updatedAt: now,
      });
      setOpen(false);
      setTitle("");
      setRationale("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request could not be saved.");
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="RESOURCE ALIGNMENT"
        title="Resource the work"
        description="Make each request traceable to a review finding and the action it enables."
        actions={<button className="button button-primary" type="button" onClick={() => setOpen(true)}><Icon name="plus" /> New request</button>}
      />
      <section className="resource-summary">
        <div className="resource-figure"><span>TOTAL REQUESTED</span><strong>{formatCurrency(derived.totalRequestAmountCents)}</strong><p>{derived.requests.length} browser-local requests</p></div>
        <div className="resource-figure"><span>AWAITING DECISION</span><strong>{formatCurrency(derived.awaitingDecisionAmountCents)}</strong><p>{derived.awaitingDecisionCount} not yet funded or declined</p></div>
        <div className="resource-figure"><span>FUNDED</span><strong>{formatCurrency(derived.fundedAmountCents)}</strong><p>{derived.requestCountsByStatus.funded} requests funded</p></div>
        <div className="resource-distribution">
          {(["requested", "recommended", "funded", "declined"] as const).map((status) => <span key={status}><i className={status} />{status}<strong>{derived.requestCountsByStatus[status]}</strong></span>)}
        </div>
      </section>
      <section className="panel request-table">
        <div className="panel-head"><div><p className="eyebrow">BY PRIORITY</p><h2>Resource requests</h2></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Priority</th><th>Request</th><th>Object code</th><th>Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{derived.requests.map((request) => <tr key={request.id}><td><span className="priority-number">{request.priority}</span></td><td><strong>{request.title}</strong><small>{request.rationale}</small></td><td>{request.objectCodeSeries} series</td><td>{formatCurrency(request.amountCents)}</td><td><span className={`status-pill ${request.status}`}>{request.status}</span></td><td><button aria-label={`Delete ${request.title}`} className="icon-button resource-delete-button" type="button" onClick={() => setDeleteItem(request)}><Icon name="close" /></button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <Modal open={open} title="New resource request" description="Link a concrete resource need to the current program review." onClose={() => setOpen(false)}>
        <form onSubmit={create}>
          <div className="form-grid">
            <label className="field field-wide"><span>Request title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="field field-wide"><span>Rationale and expected result</span><textarea required value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
            <label className="field"><span>Object code</span><select value={code} onChange={(event) => setCode(event.target.value as ObjectCodeSeries)}>{["1000","2000","3000","4000","5000","6000"].map((item) => <option key={item} value={item}>{item} series</option>)}</select></label>
            <label className="field"><span>Amount (USD)</span><input required min="0" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="modal-actions"><button className="button button-ghost" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="button button-primary" type="submit">Add request</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(deleteItem)} tone="danger" title="Delete this request?" description="This action is recorded in the local activity log and cannot be undone." onClose={() => setDeleteItem(null)}>
        <p><strong>{deleteItem?.title}</strong></p>
        <div className="modal-actions"><button className="button button-ghost" type="button" onClick={() => setDeleteItem(null)}>Keep request</button><button className="button button-danger" type="button" onClick={() => { if (deleteItem) void deleteResourceRequest(deleteItem.id).then(() => setDeleteItem(null)); }}>Delete request</button></div>
      </Modal>
    </div>
  );
}
