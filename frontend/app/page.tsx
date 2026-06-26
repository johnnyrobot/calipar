'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  TrendingUp,
  Target,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface HealthStatus {
  status: string;
  service: string;
}

export default function Home() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  useEffect(() => {
    // Check API health
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`)
      .then(res => res.json())
      .then((data: HealthStatus) => {
        if (data.status === 'healthy') {
          setApiStatus('connected');
        }
      })
      .catch(() => {
        setApiStatus('error');
      });
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Smart Context Editor',
      description: 'AI-assisted narrative writing with automatic data injection and analysis',
      href: '/reviews',
    },
    {
      icon: TrendingUp,
      title: 'Data Dashboards',
      description: 'Interactive visualizations with enrollment, success, and SLO data',
      href: '/data',
    },
    {
      icon: Target,
      title: 'Integrated Planning',
      description: 'The Golden Thread - link goals to ISMP strategic initiatives',
      href: '/planning',
    },
    {
      icon: MessageSquare,
      title: 'Mission-Bot',
      description: 'Compliance Copilot for ACCJC standards and institutional policies',
      href: '/chat',
    },
  ];

  const stats = [
    { label: 'Active Reviews', value: '12', status: 'in_progress' },
    { label: 'Pending Approval', value: '5', status: 'review' },
    { label: 'Completed This Year', value: '23', status: 'completed' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-primary-bg to-white">
      {/* Header */}
      <header className="bg-brand-ink text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
                <span className="text-brand-ink font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">CALIPAR</h1>
                <p className="text-xs text-brand-on-ink-muted">Educational Institution</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/reviews" className="text-sm hover:text-brand-accent transition-colors">
                Reviews
              </Link>
              <Link href="/data" className="text-sm hover:text-brand-accent transition-colors">
                Data
              </Link>
              <Link href="/planning" className="text-sm hover:text-brand-accent transition-colors">
                Planning
              </Link>
              <Link href="/resources" className="text-sm hover:text-brand-accent transition-colors">
                Resources
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              {apiStatus === 'connected' ? (
                <span className="flex items-center gap-1 text-xs text-status-approved">
                  <CheckCircle2 className="w-3 h-3" />
                  API Connected
                </span>
              ) : apiStatus === 'error' ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3 h-3" />
                  API Offline
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-brand-on-ink-muted">
                  <Clock className="w-3 h-3 animate-spin" />
                  Connecting...
                </span>
              )}
              <Link
                href="/login"
                className="bg-brand-accent text-brand-ink px-4 py-2 rounded-lg text-sm font-medium hover:bg-status-review transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-brand-ink mb-4">
            Program Review & Integrated Planning
          </h2>
          <p className="text-xl text-brand-muted mb-8">
            AI-enhanced platform transforming compliance-driven reviews into
            meaningful institutional improvement for educational institutions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/reviews/new"
              className="bg-brand-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-primary-hover transition-colors flex items-center gap-2"
            >
              Start New Review
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/reviews"
              className="bg-surface text-brand-primary px-6 py-3 rounded-lg font-medium border-2 border-brand-primary hover:bg-brand-primary-bg transition-colors"
            >
              View My Reviews
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface rounded-xl shadow-sm p-6 border border-brand-line"
              >
                <p className="text-sm text-brand-muted mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-brand-ink">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold font-display tracking-tight text-center text-brand-ink mb-12">
            Key Features
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group bg-surface rounded-xl shadow-sm p-6 border border-brand-line hover:border-brand-primary hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-primary-bg rounded-lg flex items-center justify-center group-hover:bg-brand-primary transition-colors">
                    <feature.icon className="w-6 h-6 text-brand-ink group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold font-display tracking-tight text-brand-ink mb-2 group-hover:text-brand-primary transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-brand-muted text-sm">{feature.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-brand-muted group-hover:text-brand-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Golden Thread Section */}
      <section className="py-16 px-4 bg-brand-ink text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl font-bold font-display tracking-tight mb-4">The Golden Thread</h3>
          <p className="text-brand-on-ink-muted mb-8">
            Every program goal connects back to institutional mission through strategic alignment
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
            <span className="bg-white/20 px-4 py-2 rounded-full">College Mission</span>
            <ChevronRight className="w-4 h-4" />
            <span className="bg-white/20 px-4 py-2 rounded-full">ISMP Strategic Goal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="bg-white/20 px-4 py-2 rounded-full">Program Goal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="bg-brand-accent text-brand-ink px-4 py-2 rounded-full font-medium">Resource Request</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-2 py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center text-sm text-brand-muted">
          <p>&copy; 2024 CALIPAR v1.0.0</p>
          <p className="mt-2">
            Powered by AI for Institutional Excellence
          </p>
        </div>
      </footer>
    </div>
  );
}
