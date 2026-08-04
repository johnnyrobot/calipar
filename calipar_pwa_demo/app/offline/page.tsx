import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main id="main-content" className="offline-page">
      <div className="offline-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">CALIPAR · LOCAL WORKSPACE</p>
      <h1>You’re off the network, not off course.</h1>
      <p>
        Your saved demo workspace is still available. Reconnect when you want to use
        Mission-Bot.
      </p>
      <Link className="button button-primary" href="/dashboard/">
        Return to dashboard
      </Link>
    </main>
  );
}
