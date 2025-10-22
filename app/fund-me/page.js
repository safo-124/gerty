'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoadingSpinner from '@/components/ui/Loading';
import { donationSchema } from '@/lib/validation';

const BACKGROUND_GRADIENT = 'bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500';

const impactPrograms = [
  {
    id: 'deprived-kids',
    icon: '🏫',
    title: 'Empowering Deprived Children',
    description:
      'Chess education in underserved neighborhoods—bringing strategy, confidence, and hope to kids who need it most.',
    metric: '240 kids reached',
    costPerChild: 35,
    outcomes: ['Improved focus & discipline', 'Problem-solving skills', 'Safe after-school space'],
  },
  {
    id: 'street-kids',
    icon: '🛣️',
    title: 'Street Children Initiative',
    description:
      'Reach vulnerable street youth with chess programs as a bridge to education, stability, and community belonging.',
    metric: '85 youth empowered',
    costPerChild: 50,
    outcomes: ['Stability & purpose', 'Re-entry to education', 'Mentorship networks'],
  },
  {
    id: 'blind-deaf',
    icon: '👁️',
    title: 'Inclusive Chess for All Abilities',
    description:
      'Adaptive chess boards, braille notation, and specialized coaching for blind and deaf communities—chess is universal.',
    metric: '45 players',
    costPerChild: 60,
    outcomes: ['Adaptive equipment', 'Specialized training', 'Competition access'],
  },
  {
    id: 'mental-health',
    icon: '🧠',
    title: 'Chess for Mental Health & Recovery',
    description:
      'Therapeutic chess programs for people healing from addiction and mental health challenges—a tool for resilience and purpose.',
    metric: '120 participants',
    costPerChild: 45,
    outcomes: ['Cognitive therapy', 'Peer support', 'Emotional healing'],
  },
];

const formatCurrency = (amount, currency = 'USD') => {
  const value = typeof amount === 'number' ? amount : Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    return `$${value.toFixed(2)}`;
  }
};

const testimonials = [
  {
    name: 'Coach Amina',
    location: 'Kenya',
    role: 'Girls & Community Initiative Lead',
    quote:
      "Before Fund Me, chess was a luxury. Now kids in underserved areas dream bigger and believe in themselves. We've seen kids transform.",
    avatar: 'CA',
  },
  {
    name: 'Marcus',
    location: 'South Africa',
    role: 'Street Youth Program Mentor',
    quote:
      "These boys were lost. Chess gave them structure, purpose, and a way to believe in their future. One is now in college.",
    avatar: 'MK',
  },
  {
    name: 'Sarah Chen',
    location: 'India',
    role: 'Inclusive Chess Coach',
    quote:
      'Adaptive chess opened doors I never imagined. Blind and deaf players competing together—the joy is indescribable.',
    avatar: 'SC',
  },
  {
    name: 'Dr. James',
    location: 'Brazil',
    role: 'Mental Health Program Director',
    quote:
      'Chess is therapy. Our recovery program has zero relapse rates in participants who engage deeply. The mind healing through strategy.',
    avatar: 'DJ',
  },
];

const presetAmounts = [25, 50, 100, 250];

const defaultFormData = {
  name: '',
  email: '',
  amount: '50',
  currency: 'USD',
  message: '',
  causeId: '',
};

export default function FundMePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalDonations: 0 });
  const [causes, setCauses] = useState([]);
  const [infoMessage, setInfoMessage] = useState('');
  const [formData, setFormData] = useState(defaultFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ success: '', error: '' });
  const [submitting, setSubmitting] = useState(false);
  const [impactCalculator, setImpactCalculator] = useState({ amount: 50, selectedProgram: 'deprived-kids' });

  const usdTotal = summary.totalAmount || 0;

  const supporterCount = summary.totalDonations || donations.length;

  const topSupporters = useMemo(
    () => donations.slice(0, 6),
    [donations],
  );

  const latestDonation = donations[0];

  const selectedProgramData = impactPrograms.find((p) => p.id === impactCalculator.selectedProgram);
  const calculatedKidsHelped = selectedProgramData
    ? Math.floor(impactCalculator.amount / selectedProgramData.costPerChild)
    : 0;

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/fund-me/donations');
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load donations');
      }

      setDonations(data.donations || []);
      setSummary({
        totalAmount: data.summary?.totalAmount || 0,
        totalDonations: data.summary?.totalDonations || data.donations?.length || 0,
      });
      setInfoMessage(data.fallback ? data.message || '' : '');
    } catch (err) {
      console.error('Fund Me donations fetch error:', err);
      setError(err.message || 'Unable to load donations');
    } finally {
      setLoading(false);
    }
  };

  const fetchCauses = async () => {
    try {
      const res = await fetch('/api/fund-me/causes');
      const data = await res.json();
      if (res.ok) setCauses(data.causes || []);
    } catch {}
  };

  useEffect(() => {
    fetchDonations();
    fetchCauses();
  }, []);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFormErrors((prev) => ({
      ...prev,
      [field]: '',
    }));
  };

  const handlePresetSelect = (amount) => {
    setFormData((prev) => ({
      ...prev,
      amount: String(amount),
    }));
    setFormErrors((prev) => ({
      ...prev,
      amount: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitStatus({ success: '', error: '' });

    const parsedAmount = Number(formData.amount);
    if (Number.isNaN(parsedAmount)) {
      setFormErrors((prev) => ({
        ...prev,
        amount: 'Please enter a valid amount',
      }));
      return;
    }

    const validation = donationSchema.safeParse({
      ...formData,
      amount: parsedAmount,
      currency: (formData.currency || 'USD').toUpperCase(),
    });

    if (!validation.success) {
      const fieldErrors = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path && issue.path[0]) {
          fieldErrors[issue.path[0]] = issue.message;
        }
      });
      setFormErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/fund-me/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...validation.data,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to process donation');
      }

      setSubmitStatus({ success: data.message || 'Thank you for your support!', error: '' });
      setFormData((prev) => ({
        ...defaultFormData,
        currency: prev.currency,
      }));
      setFormErrors({});
      await fetchDonations();
    } catch (err) {
      console.error('Donation submit error:', err);
      setSubmitStatus({ success: '', error: err.message || 'Unable to process donation right now.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className={`relative overflow-hidden px-4 py-24 text-white md:py-32 ${BACKGROUND_GRADIENT}`}>
        <div className="absolute inset-0 bg-[url('/globe.svg')] bg-cover bg-center opacity-15" aria-hidden />
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" aria-hidden />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-4 py-2 backdrop-blur-md">
            <span className="text-2xl">♟️</span>
            <span className="text-sm font-medium text-white/90">Chess Without Borders</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Chess Changes Lives.
            <span className="block text-amber-200">Help Us Reach Those Who Need It Most.</span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-white/95 md:text-xl">
            Deprived kids. Street youth. Blind and deaf players. People in recovery. Chess is universal—a tool for dignity, hope, and transformation. Your gift opens doors that seemed impossible.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#donate" className="scroll-smooth">
              <Button size="lg" className="shadow-2xl">
                Make Impact Today
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </a>
            <a href="#programs">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10">
                See Our Impact
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Impact Metrics */}
      <section className="mx-auto -mt-16 grid max-w-6xl gap-5 px-4 pb-16 sm:grid-cols-2 md:grid-cols-4">
        <Card className="border-white/70 bg-white/95 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-gray-900">{formatCurrency(usdTotal, 'USD')}</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Raised this year to change lives in vulnerable communities.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-white/70 bg-white/95 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-gray-900">{supporterCount}</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Supporters joining the movement for chess as a lifeline.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-white/70 bg-white/95 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-gray-900">490+</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Lives touched across 4 continents through chess education.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-white/70 bg-white/95 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl font-semibold text-gray-900">
              {latestDonation ? formatCurrency(latestDonation.amount, latestDonation.currency) : '—'}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Latest gift from {latestDonation?.name ?? 'a generous supporter'}.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* Programs Showcase */}
      <section id="programs" className="bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4 border-blue-300 text-blue-700">
              Our Focus Areas
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
              Chess for Community Change
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-600">
              Four transformative programs reaching the most vulnerable—each donation is a lifeline, every learner a victory.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {impactPrograms.map((program) => (
              <Card
                key={program.id}
                className="group overflow-hidden border-purple-200/60 bg-white/80 shadow-lg transition-all hover:shadow-xl hover:border-purple-400/60"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 text-2xl">
                        {program.icon}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{program.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {program.metric}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{program.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Impact areas</p>
                    <ul className="space-y-1">
                      {program.outcomes.map((outcome) => (
                        <li key={outcome} className="text-sm text-gray-700">
                          ✓ {outcome}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-amber-100/60 bg-amber-50/60 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-600">
                      {formatCurrency(program.costPerChild)} per participant
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Causes */}
      {Array.isArray(causes) && causes.length > 0 && (
        <section className="bg-gradient-to-br from-white via-slate-50 to-purple-50 px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <Badge variant="outline" className="mb-4 border-purple-300 text-purple-700">
                Current Causes
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900">Support a Cause</h2>
              <p className="mt-2 text-gray-600">Choose a cause to see its progress and direct your gift.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {causes.map((c) => {
                const total = c?.totals?.totalAmount || 0;
                const goal = c?.goalAmount || 0;
                const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : null;
                return (
                  <Card key={c.id} className="border-purple-200/60 bg-white/80">
                    <CardHeader>
                      <CardTitle className="text-xl">{c.title}</CardTitle>
                      {c.description && <CardDescription>{c.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3 flex items-center justify-between text-sm text-gray-700">
                        <span>Raised: {formatCurrency(total, 'USD')}</span>
                        {goal > 0 && <span>Goal: {formatCurrency(goal, 'USD')}</span>}
                      </div>
                      {pct !== null && (
                        <div className="h-3 w-full overflow-hidden rounded-full bg-purple-100">
                          <div className="h-full rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Impact Calculator */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-gray-900">See Your Impact</h2>
            <p className="mt-2 text-gray-600">Choose a program and donation amount to see exactly what you enable.</p>
          </div>

          <Card className="border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-blue-50/80 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Impact Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <Label className="mb-4 block text-sm font-semibold text-gray-700">Select a program</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {impactPrograms.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => setImpactCalculator((prev) => ({ ...prev, selectedProgram: program.id }))}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        impactCalculator.selectedProgram === program.id
                          ? 'border-purple-500 bg-purple-100/50 shadow-md'
                          : 'border-gray-200 bg-white/50 hover:border-purple-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{program.icon} {program.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(program.costPerChild)} per participant
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="calc-amount" className="mb-3 block text-sm font-semibold text-gray-700">
                  Your donation amount
                </Label>
                <Input
                  id="calc-amount"
                  type="number"
                  min="1"
                  step="5"
                  value={impactCalculator.amount}
                  onChange={(e) => setImpactCalculator((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                  className="text-lg"
                />
              </div>

              <div className="rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 text-center">
                <p className="text-sm uppercase tracking-wide text-amber-600">Your impact</p>
                <p className="mt-2 text-5xl font-bold text-amber-900">
                  {calculatedKidsHelped}
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  {selectedProgramData?.title.split(' ')[selectedProgramData?.title.split(' ').length - 1] || 'participants'} can access chess education
                </p>
                <p className="mt-3 text-xs text-amber-600">
                  with your {formatCurrency(impactCalculator.amount)} donation
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-to-br from-slate-50 to-purple-50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <Badge variant="outline" className="mb-4">
              Voices of Change
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900">Hear From Those We Serve</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="border-purple-100/60 bg-white/80">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 font-semibold text-white">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                      <p className="text-xs text-gray-500">
                        {testimonial.role} • {testimonial.location}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic text-gray-700">&quot;{testimonial.quote}&quot;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <section id="donate" className="relative -mt-12 scroll-smooth px-4 pb-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[3fr,2fr]">
          <Card className="border-white/70 bg-white/95 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-3xl text-gray-900">Make Your Gift Today</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Every dollar reaches the ground. We operate with zero overhead—100% of your donation fuels programs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg">✓</span>
                  <span>Transparent, monthly program reports with real stories and metrics.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg">✓</span>
                  <span>Direct partnership with 12+ NGOs and community organizations worldwide.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg">✓</span>
                  <span>Quarterly impact reports sent to all donors—see the before and after.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-lg">✓</span>
                  <span>Recognition in our global supporter community (or stay anonymous).</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-purple-200/60 bg-white/95 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Donate</CardTitle>
              <CardDescription>Choose an amount or enter your own.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <Label className="mb-2 block text-sm text-gray-700">Cause (optional)</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-purple-200/60 bg-white/70 px-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={formData.causeId}
                    onChange={(e) => handleFieldChange('causeId', e.target.value)}
                  >
                    <option value="">General Support</option>
                    {causes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-3 block text-sm text-gray-700">Amount (USD)</Label>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {presetAmounts.map((value) => {
                      const isActive = Number(formData.amount) === value;
                      return (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => handlePresetSelect(value)}
                        >
                          ${value}
                        </Button>
                      );
                    })}
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={(event) => handleFieldChange('amount', event.target.value)}
                    required
                  />
                  {formErrors.amount && <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-sm text-gray-700">Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      placeholder="Your name"
                      required
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm text-gray-700">Email (optional)</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleFieldChange('email', event.target.value)}
                      placeholder="your@email.com"
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-sm text-gray-700">Message (optional)</Label>
                  <textarea
                    className="h-20 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Who or what inspired you to give?"
                    value={formData.message}
                    onChange={(event) => handleFieldChange('message', event.target.value)}
                  />
                  {formErrors.message && <p className="mt-1 text-xs text-red-600">{formErrors.message}</p>}
                </div>

                {submitStatus.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm text-red-600">
                    {submitStatus.error}
                  </div>
                )}

                {submitStatus.success && (
                  <div className="rounded-xl border border-green-200 bg-green-50/80 p-3 text-sm text-green-700">
                    {submitStatus.success}
                  </div>
                )}

                <Button type="submit" className="w-full text-base" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Submit Pledge'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Donor Wall */}
      <section className="bg-gradient-to-br from-yellow-50 via-white to-purple-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold text-gray-900">Meet Our Supporters</h2>
            <p className="mt-2 text-gray-600">Transparency is sacred. Every gift is honored and celebrated.</p>
          </div>

          <Card className="border-amber-200/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle>Global Community of Givers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex min-h-[160px] items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
                  {error}
                </div>
              ) : infoMessage ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-700">
                  {infoMessage}
                </div>
              ) : topSupporters.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  Be the first to give and help us change lives. Your name will appear here.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {topSupporters.map((supporter) => (
                    <div
                      key={supporter.id}
                      className="rounded-2xl border border-amber-100/60 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-amber-900">{supporter.name}</p>
                          <p className="text-xs uppercase tracking-wide text-amber-500">
                            {new Date(supporter.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge variant="secondary">{formatCurrency(supporter.amount, supporter.currency)}</Badge>
                      </div>
                      {supporter.message && (
                        <p className="mt-3 text-sm text-amber-800 italic">&quot;{supporter.message}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Footer */}
      <section className={`relative overflow-hidden px-4 py-20 text-white ${BACKGROUND_GRADIENT}`}>
        <div className="absolute inset-0 opacity-10" aria-hidden />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold md:text-5xl">
            Chess Opens Doors.
            <span className="block">Help Us Unlock Them.</span>
          </h2>
          <p className="mt-6 text-lg text-white/90">
            Every donation is a life changed. Every supporter is a hero.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a href="#donate" className="scroll-smooth">
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20">
                Donate Now
              </Button>
            </a>
            <Link href="/fund-me">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/20">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
