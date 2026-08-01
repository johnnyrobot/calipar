"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";

const proof = [
  ["01", "Program review", "Shape a complete narrative from evidence, outcomes, and reflection."],
  ["02", "Integrated planning", "Trace review findings into goals, owners, resources, and institutional priorities."],
  ["03", "A thoughtful copilot", "Ask Mission-Bot for drafting help without confusing generated prose for evidence."],
];

export default function LandingPage() {
  const [onboarding, setOnboarding] = useState(false);

  return (
    <main id="main-content" className="landing" tabIndex={-1}>
      <header className="landing-nav">
        <Link className="brand brand-dark" href="/">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>CALIPAR</strong><small>Program Review · Demo</small></span>
        </Link>
        <nav aria-label="Landing">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Your data</a>
          <button className="button button-light button-compact" type="button" onClick={() => setOnboarding(true)}>
            Enter demo <Icon name="arrow" />
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span /> AI-ENHANCED PROGRAM REVIEW, GROUNDED IN YOUR WORK
          </p>
          <h1>From reflection<br />to <em>direction.</em></h1>
          <p className="hero-lede">
            CALIPAR brings evidence, planning, and resource decisions into one clear
            course—so program review becomes useful work, not another form to finish.
          </p>
          <div className="hero-actions">
            <button
              className="button button-coral button-large"
              data-testid="try-demo"
              type="button"
              onClick={() => setOnboarding(true)}
            >
              Try the interactive demo — no account needed
              <Icon name="arrow" />
            </button>
            <span>Uses synthetic data<br />and your browser only</span>
          </div>
        </div>
        <div className="hero-chart" aria-label="Illustration of review evidence becoming an integrated plan">
          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="chart-card chart-card-review">
            <span className="chart-kicker">PROGRAM REVIEW</span>
            <strong>Computer Science</strong>
            <div className="mini-progress"><i style={{ width: "72%" }} /></div>
            <small>4 of 6 sections ready</small>
          </div>
          <div className="chart-route" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
          <div className="chart-card chart-card-plan">
            <span className="chart-kicker">INTEGRATED PLAN</span>
            <strong>Improve gateway success</strong>
            <p><Icon name="check" /> Linked to Goal 2</p>
            <p><Icon name="check" /> Evidence attached</p>
            <p><Icon name="check" /> Resource aligned</p>
          </div>
          <div className="chart-note"><Icon name="spark" /> Mission-Bot<br /><span>Find the signal</span></div>
        </div>
      </section>

      <section className="landing-principles" id="how-it-works">
        <p className="section-index">THE CALIPAR COURSE</p>
        <div className="principle-grid">
          {proof.map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="local-promise" id="privacy">
        <div>
          <p className="eyebrow">A DEMO WITH A SMALL FOOTPRINT</p>
          <h2>Your workspace stays <em>close.</em></h2>
        </div>
        <div className="promise-copy">
          <p>
            Reviews, plans, resources, and chat history are kept in this browser’s
            IndexedDB. There is no login and no CALIPAR application database.
          </p>
          <p>
            Only prompts and context you deliberately send to Mission-Bot travel through
            the Cloudflare AI proxy to OpenRouter and a selected free model provider.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <span>CALIPAR</span>
        <p>Clarity for continuous improvement.</p>
        <button className="text-link" type="button" onClick={() => setOnboarding(true)}>
          Open the demo <Icon name="arrow" />
        </button>
      </footer>

      <Modal
        description="A quick orientation before your local workspace opens."
        open={onboarding}
        title="Welcome aboard."
        onClose={() => setOnboarding(false)}
      >
        <div className="onboarding-list">
          <div><span>01</span><p><strong>Synthetic, not sensitive.</strong> Use the included aggregate demo data. Do not enter student-level or confidential information.</p></div>
          <div><span>02</span><p><strong>Saved in this browser.</strong> Clearing site data removes your work. You can export a JSON backup from Settings.</p></div>
          <div><span>03</span><p><strong>AI leaves the device.</strong> Only content you submit to Mission-Bot is sent for processing. Verify generated content before using it.</p></div>
        </div>
        <div className="modal-actions">
          <button className="button button-ghost" type="button" onClick={() => setOnboarding(false)}>Not yet</button>
          <Link
            className="button button-primary"
            data-testid="onboarding-continue"
            href="/dashboard/"
          >
            Enter my local workspace <Icon name="arrow" />
          </Link>
        </div>
      </Modal>
    </main>
  );
}
