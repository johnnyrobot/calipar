import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="offline-page">
      <p className="eyebrow">404 · CHART A NEW COURSE</p>
      <h1>This page isn’t in the plan.</h1>
      <p>The demo workspace is intact. Head back to your review horizon.</p>
      <Link className="button button-primary" href="/dashboard/">
        Go to dashboard
      </Link>
    </main>
  );
}
