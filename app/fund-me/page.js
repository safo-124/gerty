'use client';

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

const BACKGROUND_GRADIENT = 'bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500';

const impactHighlights = [
  {
    title: 'Chess Labs in Ghana',
    description:
      'Portable boards, puzzle sets, and weekend coaching for 120 students across Accra and Kumasi.',
    metric: '120 kids weekly',
  },
  {
    title: 'Girls Who Play Initiative',
    description:
      'Scholarships and mentorship pairing experienced women coaches with rising talents in Kenya.',
    metric: '60 scholarships',
  },
  {
    title: 'Tournament Travel Grants',
    description:
      'Covering visas, transport, and accommodations so rural prodigies can compete on the continental stage.',
    metric: '18 trips funded',
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
    role: 'Girls Who Play Lead Mentor, Kenya',
    quote:
      'Before Fund Me, many of our girls only played blitz at home. Now they attend structured camps and dream bigger than ever.',
  },
  {
    name: 'Samuel',
    role: 'Junior Champion, Ghana',
    quote:
      'I travelled to my first international tournament because of these scholarships. I learned so much and made new friends.',
  },
  {
    name: 'Lena',
    role: 'Volunteer Coordinator',
    quote:
      'We stretch every donation to the last pawn. Transparency is at the heart of this work, and seeing the impact is energising.',
  },
];

const presetAmounts = [25, 50, 100, 250];

const defaultFormData = {
  name: '',
  email: '',
  amount: '50',
  currency: 'USD',
  message: '',
};

export default function FundMePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [donations, setDonations] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalDonations: 0 });
  const [infoMessage, setInfoMessage] = useState('');
  const [formData, setFormData] = useState(defaultFormData);
  const [formErrors, setFormErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({ success: '', error: '' });
  const [submitting, setSubmitting] = useState(false);

  const usdTotal = summary.totalAmount || 0;

  const supporterCount = summary.totalDonations || donations.length;

  const topSupporters = useMemo(
    () => donations.slice(0, 6),
    [donations],
  );

  const latestDonation = donations[0];

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

  useEffect(() => {
    fetchDonations();
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
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50 to-blue-50">
      <section className={`relative overflow-hidden px-4 py-20 text-white md:py-28 ${BACKGROUND_GRADIENT}`}>
        <div className="absolute inset-0 bg-[url('/globe.svg')] bg-cover bg-center opacity-10" aria-hidden />
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" aria-hidden />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" aria-hidden />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 border-white/60 bg-white/10 text-white">
            Fund Me · Chess Without Borders
          </Badge>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            Help Us Bring Chess Education to Kids in Emerging Communities
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-white/90 md:text-xl">
            Every contribution powers after-school clubs, equips coaches, and unlocks international opportunities for young players across Africa and beyond.
          </p>
          <div className="mt-10 grid w-full gap-5 sm:grid-cols-2 md:grid-cols-3">
            <Card className="border-white/40 bg-white/20 text-left text-white">
              <CardHeader className="space-y-2">
                <CardTitle className="text-3xl font-semibold">{formatCurrency(usdTotal, 'USD')}</CardTitle>
                <CardDescription className="text-white/80">
                  Raised this year thanks to families, schools, and generous chess fans.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-white/40 bg-white/20 text-left text-white">
              <CardHeader className="space-y-2">
                <CardTitle className="text-3xl font-semibold">{supporterCount}</CardTitle>
                <CardDescription className="text-white/80">
                  Supporters joining the movement for equitable chess access.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-white/40 bg-white/20 text-left text-white">
              <CardHeader className="space-y-2">
                <CardTitle className="text-3xl font-semibold">
                  {latestDonation ? formatCurrency(latestDonation.amount, latestDonation.currency) : '—'}
                </CardTitle>
                <CardDescription className="text-white/80">
                  Latest gift from {latestDonation?.name ?? 'a generous supporter'}.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="relative -mt-12 px-4 pb-12">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[3fr,2fr]">
          <Card className="border-white/70 bg-white/95 shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl text-gray-900">Fuel the Next Move</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Your donation equips classrooms, funds safe travel, and keeps community clubs thriving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-700">
              <p>
                From recycled boards to full scholarship packages, every contribution stretches farther when we pool resources together. Choose an amount that feels right or enter your own.
              </p>
              <ul className="space-y-2">
                <li>• $25 sends a tournament-ready kit to a rural classroom.</li>
                <li>• $50 sponsors weekly coaching for a budding prodigy.</li>
                <li>• $100 helps cover international travel paperwork.</li>
                <li>• $250 launches a pop-up club with volunteer mentors.</li>
              </ul>
              <div className="rounded-2xl border border-purple-100/60 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-500">Transparency first</p>
                <p className="mt-2 text-sm text-purple-900">
                  Quarterly reports outline spend, milestones, and stories from the field. You&apos;ll receive the latest once you donate.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200/60 bg-white/95 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Make a Donation</CardTitle>
              <CardDescription className="text-base text-gray-600">
                Secure payment handled offline—submit your pledge and we will send follow-up instructions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <Label className="text-sm text-gray-700" htmlFor="donation-amount">
                    Contribution amount (USD)
                  </Label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {presetAmounts.map((value) => {
                      const isActive = Number(formData.amount) === value;
                      return (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={isActive ? 'gradient' : 'outline'}
                          onClick={() => handlePresetSelect(value)}
                        >
                          ${value}
                        </Button>
                      );
                    })}
                  </div>
                  <Input
                    id="donation-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    className="mt-3"
                    value={formData.amount}
                    onChange={(event) => handleFieldChange('amount', event.target.value)}
                    required
                  />
                  {formErrors.amount && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.amount}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm text-gray-700" htmlFor="donation-name">
                      Full name
                    </Label>
                    <Input
                      id="donation-name"
                      value={formData.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      placeholder="Alex Moyo"
                      required
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700" htmlFor="donation-email">
                      Email (optional)
                    </Label>
                    <Input
                      id="donation-email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleFieldChange('email', event.target.value)}
                      placeholder="you@example.com"
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-700" htmlFor="donation-message">
                    Message (optional)
                  </Label>
                  <textarea
                    id="donation-message"
                    className="mt-2 h-28 w-full rounded-xl border border-purple-200/60 bg-white/70 p-3 text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Share encouragement for the kids or note a specific program you love."
                    value={formData.message}
                    onChange={(event) => handleFieldChange('message', event.target.value)}
                  />
                  {formErrors.message && (
                    <p className="mt-1 text-xs text-red-600">{formErrors.message}</p>
                  )}
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

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Submit pledge'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-[2fr,3fr]">
        <Card className="border-purple-200/60 bg-white/80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900">Where Your Gift Goes</CardTitle>
            <CardDescription className="text-base text-gray-600">
              We carefully steward every donation to stretch opportunity across communities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {impactHighlights.map((highlight) => (
              <div key={highlight.title} className="rounded-xl border border-purple-100/70 bg-purple-50/70 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-purple-900">{highlight.title}</h3>
                  <Badge variant="secondary">{highlight.metric}</Badge>
                </div>
                <p className="mt-2 text-sm text-purple-800/80">{highlight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-200/60 bg-white/90 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900">Why Fund Me Exists</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Play shouldn’t be a privilege. We partner with schools, volunteers, and federations to place chess opportunities within reach.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-gray-700">
            <p>
              Across many regions, the price of a chess set equals a week’s wages. Quality coaching? Often out of reach entirely. Fund Me is our commitment to change that calculus.
            </p>
            <p>
              Donations fuel equipment drop-offs, translator stipends, safe travel to national qualifiers, and stipends for community coaches. All programs are monitored with transparent reporting so you can see the board state after every move.
            </p>
            <div className="rounded-2xl border border-blue-100/70 bg-blue-50/60 p-5">
              <p className="text-sm uppercase tracking-wide text-blue-500">Key Milestones</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>• 15 community hubs launched in the last 18 months.</li>
                <li>• 82% of scholarship recipients improved their rating by 150+ points.</li>
                <li>• 40 volunteer coaches trained through our digital academy.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="bg-white/90 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border-purple-100/60 bg-white/80">
              <CardHeader>
                <Badge variant="outline" className="mb-4 border-purple-200 text-purple-700">
                  {testimonial.role}
                </Badge>
                <CardTitle className="text-xl text-gray-900">{testimonial.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">“{testimonial.quote}”</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-yellow-50 via-white to-purple-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <Card className="border-amber-200/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">Meet Our Supporters</CardTitle>
              <CardDescription className="text-base text-gray-600">
                We publish every gift so you can see the ripple effect you are part of.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {infoMessage && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
                  {infoMessage}
                </div>
              )}
              {loading ? (
                <div className="flex min-h-[160px] items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
                  {error}
                </div>
              ) : topSupporters.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Be the first to donate and watch your name appear here.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {topSupporters.map((supporter) => (
                    <div
                      key={supporter.id}
                      className="rounded-2xl border border-amber-100/60 bg-amber-50/80 p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-amber-900">
                            {supporter.name}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-amber-500">
                            {new Date(supporter.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge variant="warning">
                          {formatCurrency(supporter.amount, supporter.currency)}
                        </Badge>
                      </div>
                      {supporter.message && (
                        <p className="mt-3 text-sm text-amber-800">{supporter.message}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
