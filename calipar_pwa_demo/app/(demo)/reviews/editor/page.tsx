import { Suspense } from "react";
import { ReviewEditor } from "@/components/review-editor";

export default function ReviewEditorPage() {
  return (
    <Suspense fallback={<p role="status">Opening review…</p>}>
      <ReviewEditor />
    </Suspense>
  );
}
