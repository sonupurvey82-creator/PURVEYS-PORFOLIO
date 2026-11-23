import React, { useState } from 'react';
import { AlertCircle, Check, Copy, ExternalLink, Mail, Send } from 'lucide-react';
import { ParallaxLayer } from './ParallaxLayer';
import { SocialLinks } from './SocialLinks';

const PROJECT_TYPES = [
  'Showreel Edit',
  'Commercial',
  'Motion & VFX',
  'Full Production',
] as const;

type ProjectType = (typeof PROJECT_TYPES)[number];

interface SubmittedInquiry {
  id: string;
  name: string;
  email: string;
  projectType: ProjectType;
  message: string;
  submittedAt: number;
}

const CONTACT_EMAIL = 'hello@purvey.com';
const STORAGE_KEY = 'tigris_reel_inquiries_v1';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [projectType, setProjectType] = useState<ProjectType>('Showreel Edit');
  const [message, setMessage] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<SubmittedInquiry | null>(null);

  const buildMailtoHref = (payload: {
    name: string;
    email: string;
    projectType: ProjectType;
    message: string;
  }) => {
    const subject = encodeURIComponent(
      `[PURVEY] ${payload.projectType} Inquiry${payload.name ? ` — ${payload.name}` : ''}`
    );
    const bodyLines = [
      payload.name ? `Name: ${payload.name}` : '',
      payload.email ? `Reply Email: ${payload.email}` : '',
      `Project Scope: ${payload.projectType}`,
      '',
      payload.message || 'Hi PURVEY, I would like to discuss a project.',
    ].filter((line, idx, arr) => line !== '' || (idx > 0 && arr[idx - 1] !== ''));
    const body = encodeURIComponent(bodyLines.join('\n'));
    return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      setCopiedEmail(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      setErrorText('Please enter your name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorText('Please enter a valid email address.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setErrorText('Please include a brief description of your project (at least 10 characters).');
      return;
    }

    setErrorText(null);

    const inquiry: SubmittedInquiry = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      email: trimmedEmail,
      projectType,
      message: trimmedMessage,
      submittedAt: Date.now(),
    };

    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY);
      const existing: SubmittedInquiry[] = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([inquiry, ...existing].slice(0, 20)));
    } catch {
      // Ignore storage quota issues cleanly
    }

    setSubmitted(inquiry);
  };

  const handleReset = () => {
    setSubmitted(null);
    setName('');
    setEmail('');
    setMessage('');
    setErrorText(null);
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="mx-auto w-full max-w-[1440px] scroll-mt-20 px-4 pt-6 pb-20 sm:px-6"
    >
      <div className="mb-8 border-t border-white/10 pt-12">
        <h2
          id="contact-heading"
          className="text-xl font-semibold tracking-tight text-[#FAF6F0] sm:text-2xl"
        >
          Contact
        </h2>
      </div>

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
        {/* Left Column: Editorial Lead & Direct Channels */}
        <ParallaxLayer offset={14} className="lg:col-span-5">
          <h3 className="font-display text-3xl font-semibold tracking-tight text-[#FAF6F0] sm:text-4xl [text-wrap:balance]">
            Let&rsquo;s craft your next cut.
          </h3>

          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#B6A99A]">
            Available for showreel direction, commercial edits, motion graphics, and end-to-end visual post-production.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#8C7F70]">
            <span>Remote Worldwide</span>
            <span aria-hidden="true">·</span>
            <span>Direct Collaboration</span>
            <span aria-hidden="true">·</span>
            <span>Fast Turnaround</span>
          </div>

          <div className="mt-8 space-y-6 border-t border-white/10 pt-6">
            <div>
              <p className="text-xs font-medium text-[#8C7F70]">Direct Email</p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex min-h-[40px] items-center gap-2 text-base font-medium text-[#FAF6F0] transition-colors duration-150 hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded-lg"
                >
                  <Mail className="h-4 w-4 text-[#F97316] shrink-0" aria-hidden="true" />
                  <span>{CONTACT_EMAIL}</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#F97316]/30 bg-[#1B130E]/85 px-3 text-xs font-medium text-[#FDBA74] transition-colors duration-150 hover:border-[#F97316] hover:bg-[#EA580C] hover:text-[#FFF7ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-[#8C7F70]">Social Channels</p>
              <SocialLinks variant="compact" />
            </div>
          </div>
        </ParallaxLayer>

        {/* Right Column: Interactive Project Inquiry Card */}
        <ParallaxLayer offset={26} className="lg:col-span-7">
          <div className="rounded-[28px] border border-[#F97316]/25 bg-[#0B170F]/90 p-6 sm:p-8">
            {submitted ? (
              <div className="space-y-6">
                <div className="flex items-start gap-3.5">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EA580C]/20 text-[#F97316]">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="font-display text-xl font-semibold text-[#FAF6F0]">
                      Message Prepared
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-[#B6A99A]">
                      Thanks, {submitted.name}. Your inquiry has been saved locally—click below to launch it straight in your email client if you&rsquo;d like to send immediately.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-5 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#A89A8A]">
                    <span>{submitted.projectType}</span>
                    <span aria-hidden="true">·</span>
                    <span>{submitted.email}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#E7DDD1]">
                    {submitted.message}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex min-h-[42px] items-center rounded-xl border border-white/15 bg-[#1C1511] px-4 py-2 text-xs font-medium text-[#D6CBC0] transition-colors duration-150 hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Send Another Message
                  </button>

                  <a
                    href={buildMailtoHref(submitted)}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#EA580C] px-5 py-2.5 text-xs font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Open in Email App</span>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div>
                  <span className="block text-xs font-medium text-[#B6A99A] mb-2.5">
                    Project Scope
                  </span>
                  <div
                    role="group"
                    aria-label="Project scope"
                    className="flex flex-wrap gap-2"
                  >
                    {PROJECT_TYPES.map((type) => {
                      const active = projectType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setProjectType(type)}
                          aria-pressed={active}
                          className={`inline-flex min-h-[40px] items-center rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'border-[#F97316] bg-[#EA580C] text-[#FFF7ED]'
                              : 'border-white/15 bg-[#0B0908]/80 text-[#D6CBC0] hover:border-[#F97316]/50 hover:text-[#FAF6F0]'
                          }`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] transition-colors focus:border-[#F97316] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm text-[#FAF6F0] placeholder-[#6B5F52] transition-colors focus:border-[#F97316] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="mb-1.5 block text-xs font-medium text-[#B6A99A]"
                  >
                    Project Details
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share your vision, timeline, footage format, or reference links..."
                    required
                    className="w-full resize-y rounded-xl border border-white/15 bg-[#0B0908] px-3.5 py-2.5 text-sm leading-relaxed text-[#FAF6F0] placeholder-[#6B5F52] transition-colors focus:border-[#F97316] focus:outline-none"
                  />
                </div>

                {errorText && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <a
                    href={buildMailtoHref({ name, email, projectType, message })}
                    className="inline-flex min-h-[42px] items-center gap-1.5 text-xs font-medium text-[#D6CBC0] transition-colors duration-150 hover:text-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded-lg px-1 whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Open in Email App</span>
                  </a>

                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#EA580C] px-6 py-2.5 text-sm font-semibold text-[#FFF7ED] transition-colors duration-150 hover:bg-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140F0C] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </ParallaxLayer>
      </div>
    </section>
  );
};
