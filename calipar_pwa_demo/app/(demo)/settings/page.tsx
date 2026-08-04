"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { PageHeading } from "@/components/page-heading";
import { useWorkspace } from "@/components/workspace-provider";
import { exportWorkspace, importWorkspace, resetWorkspace } from "@/lib/db/repository";
import type { WorkspaceExport } from "@/lib/domain/types";

function downloadWorkspace(payload: WorkspaceExport, suffix = "") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `calipar-demo-workspace${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const router = useRouter();
  const { state } = useWorkspace();
  const data = state.status === "ready" ? state.data : null;
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<WorkspaceExport | null>(null);
  const [rawImport, setRawImport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  if (!data) return null;

  const exportData = async () => {
    setError("");
    try {
      downloadWorkspace(await exportWorkspace());
      setNotice("Workspace backup downloaded. It is not encrypted; store it appropriately.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workspace could not be exported.");
    }
  };

  const selectImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceExport;
      if (parsed.format !== "calipar-demo-workspace" || parsed.schemaVersion !== 1 || !parsed.data) {
        throw new Error("This is not a supported CALIPAR demo workspace export.");
      }
      setPendingImport(parsed);
      setRawImport(text);
      setImportOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The selected file could not be read.");
    } finally {
      event.target.value = "";
    }
  };

  const confirmImport = async () => {
    if (!rawImport) return;
    setBusy(true);
    setError("");
    try {
      downloadWorkspace(await exportWorkspace(), "-pre-import");
      await importWorkspace(rawImport);
      setImportOpen(false);
      setRawImport(null);
      setPendingImport(null);
      setNotice("Workspace replaced successfully. A pre-import backup was downloaded first.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed; the current workspace was not replaced.");
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async () => {
    setBusy(true);
    setError("");
    try {
      await resetWorkspace();
      setResetOpen(false);
      setNotice("The demo workspace was reset to its synthetic starting point.");
      router.push("/dashboard/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The workspace could not be reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="SETTINGS & LOCAL DATA"
        title="Keep your bearings"
        description="Understand what lives in this browser, take a backup, or return the demo to its starting point."
      />
      {notice ? <div className="settings-notice" role="status"><Icon name="check" />{notice}</div> : null}
      {error ? <div className="form-error" role="alert">{error}</div> : null}
      <section className="settings-grid">
        <article className="settings-card settings-card-primary">
          <div className="settings-card-icon"><Icon name="compass" /></div>
          <p className="eyebrow">LOCAL-FIRST BY DESIGN</p>
          <h2>This workspace lives here.</h2>
          <p>Program reviews, plans, resource requests, activity, and saved chat messages are stored in this browser profile’s IndexedDB.</p>
          <dl>
            <div><dt>Reviews</dt><dd>{data.reviews.length}</dd></div>
            <div><dt>Plans</dt><dd>{data.actionPlans.length}</dd></div>
            <div><dt>Requests</dt><dd>{data.resourceRequests.length}</dd></div>
            <div><dt>Chat messages</dt><dd>{data.chatMessages.length}</dd></div>
          </dl>
        </article>
        <article className="settings-card">
          <div className="settings-card-icon"><Icon name="download" /></div>
          <p className="eyebrow">BACKUP & RESTORE</p>
          <h2>Move a demo workspace</h2>
          <p>Export a versioned JSON backup, or replace this workspace from a compatible backup. Exports are not encrypted.</p>
          <div className="settings-actions">
            <button className="button button-primary" data-testid="settings-export" type="button" onClick={() => void exportData()}><Icon name="download" /> Export workspace</button>
            <button className="button button-ghost" type="button" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Import workspace</button>
            <label className="sr-only" htmlFor="settings-import-file">Import workspace from a JSON backup file</label>
            <input ref={fileRef} accept="application/json,.json" className="sr-only" data-testid="settings-import" id="settings-import-file" type="file" onChange={(event) => void selectImport(event)} />
          </div>
        </article>
        <article className="settings-card">
          <div className="settings-card-icon"><Icon name="refresh" /></div>
          <p className="eyebrow">START FRESH</p>
          <h2>Reset the demonstration</h2>
          <p>Clear domain and chat records, then restore the deterministic synthetic seed. Display preferences remain.</p>
          <button className="button button-danger" data-testid="settings-reset" type="button" onClick={() => setResetOpen(true)}><Icon name="refresh" /> Reset demo workspace</button>
        </article>
        <article className="settings-card">
          <div className="settings-card-icon"><Icon name="warning" /></div>
          <p className="eyebrow">IMPORTANT BOUNDARIES</p>
          <h2>A demo—not a records system</h2>
          <ul>
            <li>Use synthetic aggregate information only.</li>
            <li>Clearing site data deletes the workspace.</li>
            <li>AI prompts leave the browser when submitted.</li>
            <li>Generated content requires human review.</li>
          </ul>
        </article>
      </section>
      <Modal open={resetOpen} tone="danger" title="Reset the entire demo workspace?" description="Reviews, plans, resource requests, activity, and chat history will be replaced by the original synthetic demo data." onClose={() => setResetOpen(false)}>
        <p>This cannot be undone unless you export a workspace backup first.</p>
        <div className="modal-actions"><button className="button button-ghost" type="button" onClick={() => setResetOpen(false)}>Keep my workspace</button><button className="button button-danger" data-testid="confirm-reset" disabled={busy} type="button" onClick={() => void confirmReset()}>{busy ? "Resetting…" : "Reset and reseed"}</button></div>
      </Modal>
      <Modal open={importOpen} tone="danger" title="Replace this workspace?" description="CALIPAR validated the file header. The full schema and record relationships are validated transactionally during import." onClose={() => setImportOpen(false)}>
        {pendingImport ? <div className="import-preview"><div><span>Reviews</span><strong>{pendingImport.data.reviews.length}</strong></div><div><span>Plans</span><strong>{pendingImport.data.actionPlans.length}</strong></div><div><span>Requests</span><strong>{pendingImport.data.resourceRequests.length}</strong></div><div><span>Messages</span><strong>{pendingImport.data.chatMessages.length}</strong></div></div> : null}
        <p>A backup of the current workspace will download before replacement begins.</p>
        <div className="modal-actions"><button className="button button-ghost" type="button" onClick={() => setImportOpen(false)}>Cancel</button><button className="button button-danger" disabled={busy} type="button" onClick={() => void confirmImport()}>{busy ? "Importing…" : "Download backup & replace"}</button></div>
      </Modal>
    </div>
  );
}
