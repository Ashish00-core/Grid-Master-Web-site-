import React, { useCallback, useState } from 'react';
import {
  MailCheck, PlayCircle, Loader2, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Trash2, Copy, Check, ServerCog, Inbox, Settings2, Send, ExternalLink, ShieldCheck, Phone, MessageCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { COMPANY_INFO } from '../data/solarData';
import {
  MAIL_CONFIG,
  CHANNELS,
  buildTestMessage,
  deliverMessage,
  flushOutbox,
  getOutbox,
  removeQueuedMessage,
  clearOutbox,
  getDeliveryLog,
  clearDeliveryLog,
  appendDeliveryLog,
  sendViaBackend,
  sendViaFormSubmit,
  sendViaWeb3Forms,
  sendViaWebhook,
  isHttpUrl,
  getMailSettings,
  saveMailSettings,
  resetMailSettings,
  resolveRecipient,
  mailtoHref,
  whatsappHref,
  callHref,
  isValidEmail,
  DELIVERY_STATES,
} from '../lib/mailDelivery';

const CHANNEL_TESTERS = {
  webhook: sendViaWebhook,
  backend: sendViaBackend,
  formsubmit: sendViaFormSubmit,
  web3forms: sendViaWeb3Forms,
};

const stateStyles = {
  [DELIVERY_STATES.delivered]: {
    icon: CheckCircle2,
    wrap: 'border-emerald-500/40 bg-emerald-500/10',
    text: 'text-emerald-300',
    title: 'Automatic e-mail delivery confirmed',
  },
  [DELIVERY_STATES.activation]: {
    icon: AlertTriangle,
    wrap: 'border-amber-500/40 bg-amber-500/10',
    text: 'text-amber-300',
    title: 'One-time FormSubmit activation is still pending',
  },
  [DELIVERY_STATES.queued]: {
    icon: AlertTriangle,
    wrap: 'border-amber-500/40 bg-amber-500/10',
    text: 'text-amber-300',
    title: 'Saved on this device — automatic delivery not confirmed yet',
  },
  [DELIVERY_STATES.failed]: {
    icon: XCircle,
    wrap: 'border-red-500/40 bg-red-500/10',
    text: 'text-red-300',
    title: 'Delivery failed',
  },
};

export default function MailDeliveryPage() {
  const [settings, setSettings] = useState(() => getMailSettings());
  const [recipientDraft, setRecipientDraft] = useState(() => getMailSettings().recipient);
  const [ccDraft, setCcDraft] = useState(() => getMailSettings().cc.join(', '));
  const [relayDraft, setRelayDraft] = useState(() => getMailSettings().webhookUrl);
  const [relaySecretDraft, setRelaySecretDraft] = useState(() => getMailSettings().webhookSecret);
  const [web3formsDraft, setWeb3formsDraft] = useState(() => getMailSettings().web3formsKey);
  const [savedNote, setSavedNote] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isFlushing, setIsFlushing] = useState(false);
  const [flushSummary, setFlushSummary] = useState(null);
  const [outbox, setOutbox] = useState(() => getOutbox());
  const [log, setLog] = useState(() => getDeliveryLog());
  const [copiedId, setCopiedId] = useState('');

  const refresh = useCallback(() => {
    setOutbox(getOutbox());
    setLog(getDeliveryLog());
    setSettings(getMailSettings());
  }, []);

  const recipient = resolveRecipient(settings);
  const backendLikelyAvailable = MAIL_CONFIG.backendEnabled;

  const flash = (note) => {
    setSavedNote(note);
    setTimeout(() => setSavedNote(''), 2600);
  };

  const handleSaveSettings = () => {
    const ccList = ccDraft
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (recipientDraft.trim() && !isValidEmail(recipientDraft.trim())) {
      flash('That recipient address does not look valid — nothing was saved.');
      return;
    }
    const invalidCc = ccList.find((entry) => !isValidEmail(entry));
    if (invalidCc) {
      flash(`"${invalidCc}" is not a valid CC address — nothing was saved.`);
      return;
    }
    if (relayDraft.trim() && !isHttpUrl(relayDraft.trim())) {
      flash('The personal relay must be an https:// URL (the one Google Apps Script gives you ends with /exec).');
      return;
    }

    const next = saveMailSettings({
      recipient: recipientDraft.trim(),
      cc: ccList,
      webhookUrl: relayDraft.trim(),
      webhookSecret: relaySecretDraft.trim(),
      web3formsKey: web3formsDraft.trim(),
    });
    setSettings(next);
    flash(`Saved on this device — bookings now go to ${resolveRecipient(next)}.`);
  };

  const handleResetSettings = () => {
    const next = resetMailSettings();
    setSettings(next);
    setRecipientDraft('');
    setCcDraft('');
    setRelayDraft('');
    setRelaySecretDraft('');
    setWeb3formsDraft('');
    flash(`Reset to the default inbox ${COMPANY_INFO.email}.`);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResults(null);
    const message = buildTestMessage();
    const results = [];

    for (const id of Object.keys(CHANNEL_TESTERS)) {
      const outcome = await CHANNEL_TESTERS[id](message, { replyTo: '' });
      results.push({
        channel: id,
        label: CHANNELS[id].label,
        hint: CHANNELS[id].hint,
        ok: Boolean(outcome.ok),
        skipped: Boolean(outcome.skipped),
        activationRequired: Boolean(outcome.activationRequired),
        detail: outcome.detail || (outcome.ok ? 'Sent.' : 'Failed.'),
        raw: outcome.raw || '',
        at: new Date().toISOString(),
      });
    }

    const delivered = results.find((entry) => entry.ok);
    const report = {
      channel: delivered?.channel || results[1]?.channel,
      label: delivered?.label || results[1]?.label,
      recipient: resolveRecipient(),
      detail: delivered
        ? `Test e-mail delivered to ${resolveRecipient()} via ${delivered.label}.`
        : results[1]?.detail || 'No relay accepted the test message.',
    };

    setTestResults({ message, results, delivered: Boolean(delivered) });
    setIsTesting(false);
    appendDeliveryLog({
      at: new Date().toISOString(),
      kind: 'test',
      reference: message.fields.reference_id,
      ok: Boolean(delivered),
      channel: report.channel,
      detail: report.detail,
    });
    refresh();
  };

  const handleFlush = async () => {
    setIsFlushing(true);
    const summary = await flushOutbox();
    setFlushSummary(summary);
    setIsFlushing(false);
    refresh();
  };

  const handleRetrySingle = async (entry) => {
    setIsFlushing(true);
    const report = await deliverMessage(entry.message, {
      reference: entry.reference,
      kind: entry.kind,
      queueId: entry.id,
    });
    if (report.ok) removeQueuedMessage(entry.id);
    setFlushSummary({ attempted: 1, delivered: report.ok ? 1 : 0, results: [{ ...report, id: entry.id }] });
    setIsFlushing(false);
    refresh();
  };

  const handleCopy = (id, text) => {
    const done = () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const helper = document.createElement('textarea');
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      try { document.execCommand('copy'); } catch { /* noop */ }
      document.body.removeChild(helper);
      done();
    }
  };

  const testMessage = testResults?.message;
  const headline = testResults
    ? testResults.delivered
      ? stateStyles[DELIVERY_STATES.delivered]
      : testResults.results.some((entry) => entry.activationRequired)
        ? stateStyles[DELIVERY_STATES.activation]
        : stateStyles[DELIVERY_STATES.queued]
    : null;

  return (
    <>
      <PageHeader
        icon={MailCheck}
        eyebrow="Mail Delivery Center"
        title="Automatic booking e-mails —"
        highlight="status & one-time setup"
        description="Every booking, quote and contact form on this website is e-mailed automatically to the inbox below. Use this page to verify delivery, finish the one-time relay activation, and re-send anything that is still queued."
      />

      <section className="pt-4 pb-20 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          {/* 1. Recipient */}
          <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Receiving inbox</p>
                <h2 className="text-xl sm:text-2xl font-black text-white font-mono break-all">{recipient}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Default company inbox configured in <span className="font-mono">src/data/solarData.js</span>.
                  {settings.recipient && ' A device override is currently active.'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  <Inbox className="w-3.5 h-3.5 text-amber-400" />
                  {outbox.length} queued
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                  <ServerCog className="w-3.5 h-3.5 text-amber-400" />
                  {settings.webhookUrl
                    ? 'Own e-mail relay active'
                    : backendLikelyAvailable
                      ? 'Server relay enabled'
                      : 'FormSubmit relay only'}
                </span>
              </div>
            </div>

            <details className="mt-5 group">
              <summary className="cursor-pointer text-xs font-bold text-amber-300 inline-flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Change where bookings are delivered (this device only)
              </summary>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-slate-300">
                  Recipient e-mail
                  <input
                    type="email"
                    value={recipientDraft}
                    onChange={(event) => setRecipientDraft(event.target.value)}
                    placeholder={COMPANY_INFO.email}
                    className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Extra copies (comma separated)
                  <input
                    type="text"
                    value={ccDraft}
                    onChange={(event) => setCcDraft(event.target.value)}
                    placeholder="engineer@example.com, office@example.com"
                    className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-950 border border-slate-800 p-4">
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  How to get the “Personal relay URL” (own Gmail — the most reliable option)
                </p>
                <ol className="mt-2.5 space-y-1.5 text-[11px] text-slate-300 list-decimal list-inside">
                  <li>
                    Open{" "}
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline"
                    >
                      script.google.com
                    </a>{" "}
                    → <strong className="text-white">New project</strong>.
                  </li>
                  <li>
                    Paste the ready-made script from{" "}
                    <span className="font-mono text-amber-300">docs/google-apps-script-mail-relay.gs</span>{" "}
                    (open it on GitHub and press the copy button).
                  </li>
                  <li>
                    <strong className="text-white">Deploy → New deployment → Web app</strong>:{" "}
                    <em>Execute as</em> <strong className="text-white">Me</strong>, <em>Who has access</em>{" "}
                    <strong className="text-white">Anyone</strong> → <strong className="text-white">Deploy</strong>.
                  </li>
                  <li>
                    Copy the <strong className="text-white">Web app URL</strong> it shows (it ends with{" "}
                    <span className="font-mono text-amber-300">/exec</span>).
                  </li>
                  <li>
                    Paste that URL into the field below — <strong className="text-white">no code changes are
                    needed anywhere</strong>, and you never edit{" "}
                    <span className="font-mono">src/lib/mailDelivery.js</span>.
                  </li>
                </ol>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-slate-300">
                  Personal relay URL — own Gmail / Zapier / Make (most reliable)
                  <input
                    type="url"
                    value={relayDraft}
                    onChange={(event) => setRelayDraft(event.target.value)}
                    placeholder="https://script.google.com/macros/s/…/exec"
                    className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs text-slate-300">
                  Shared secret (optional, must match the script)
                  <input
                    type="text"
                    value={relaySecretDraft}
                    onChange={(event) => setRelaySecretDraft(event.target.value)}
                    placeholder="any long random text"
                    className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs text-slate-300 sm:col-span-2">
                  Web3Forms access key (optional extra backup relay)
                  <input
                    type="text"
                    value={web3formsDraft}
                    onChange={(event) => setWeb3formsDraft(event.target.value)}
                    placeholder="paste the free access key from web3forms.com"
                    className="mt-1 w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
                >
                  Save &amp; use this relay
                </button>
                <button
                  onClick={handleResetSettings}
                  className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs hover:border-amber-500/40 transition-all"
                >
                  Reset to company inbox
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                After saving, press <strong className="text-slate-300">“Run live delivery test”</strong> below:
                the “Own mail relay” line must turn green and a test e-mail must arrive in{" "}
                <strong className="text-slate-300">{recipient}</strong>. Saving here applies to{" "}
                <strong className="text-slate-300">this browser only</strong> — for all visitors on all
                devices, set the same URL as <span className="font-mono">VITE_MAIL_WEBHOOK_URL</span> in your
                Netlify/Vercel environment variables and redeploy (or ask to have it wired into the code).
              </p>
            </details>

            {savedNote && (
              <p className="mt-4 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                {savedNote}
              </p>
            )}
          </div>

          {/* 2. Live test */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Live verification</p>
                <h2 className="text-xl sm:text-2xl font-black text-white">Run a real delivery test</h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Sends one marked test message through every relay and shows the exact answer of each one.
                  This is the fastest way to prove that booking mails reach the inbox.
                </p>
              </div>
              <button
                onClick={handleRunTest}
                disabled={isTesting}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all disabled:opacity-70"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                <span>{isTesting ? 'Testing relays…' : 'Run live delivery test'}</span>
              </button>
            </div>

            {headline && (
              <div className={`mt-5 rounded-2xl border p-4 ${headline.wrap}`}>
                <p className={`text-sm font-black flex items-center gap-2 ${headline.text}`}>
                  <headline.icon className="w-4 h-4" />
                  {headline.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {testResults.results.map((entry) => (
                    <li key={entry.channel} className="flex items-start gap-2 text-xs text-slate-300">
                      {entry.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : entry.skipped ? (
                        <span className="w-4 text-center text-slate-500 flex-shrink-0 mt-0.5">–</span>
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>
                        <strong className="text-white">{entry.label}</strong> — {entry.detail}
                        <span className="block text-[10px] text-slate-500">{entry.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                  {testMessage && (
                    <>
                      <a
                        href={mailtoHref(testMessage)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs hover:border-amber-500/40 transition-all"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        Open test mail in my mail app
                      </a>
                      <a
                        href={whatsappHref(`${testMessage.subject}\n\n${testMessage.text}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp the test
                      </a>
                      <button
                        onClick={() => handleCopy('test', `${testMessage.subject}\n\n${testMessage.text}`)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs hover:border-amber-500/40 transition-all"
                      >
                        {copiedId === 'test' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                        {copiedId === 'test' ? 'Copied' : 'Copy test message'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {testResults && !testResults.delivered && (
              <div className="mt-4 rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 space-y-3">
                <p className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  How to finish the setup in 60 seconds
                </p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Click “Run live delivery test” above (that is what asks FormSubmit to send the activation
                    e-mail).
                  </li>
                  <li>
                    Open <strong className="text-amber-300">{recipient}</strong> and search for{" "}
                    <strong className="text-white">“Activate Form”</strong> — it comes from{" "}
                    <span className="font-mono">formsubmit.co</span>. Check the <strong>Spam</strong> and{" "}
                    <strong>Promotions</strong> folders too and mark it “Not spam”.
                  </li>
                  <li>
                    Click the <strong className="text-white">Activate Form</strong> link inside that e-mail.
                    You will see “Form Activated”.
                  </li>
                  <li>
                    Come back here and press “Run live delivery test” once more — every relay should now turn
                    green and all queued bookings are re-sent automatically.
                  </li>
                </ol>
                <p className="text-slate-400">
                  Prefer zero third-party setup? Deploy the included serverless endpoint with your own
                  provider key and messages are sent straight from your domain instead — see{" "}
                  <span className="font-mono">server/mailProvider.mjs</span> (Resend, SendGrid or Brevo, free
                  tiers available).
                </p>
              </div>
            )}
          </div>

          {/* 3. Outbox */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Automatic safety net</p>
                <h2 className="text-xl sm:text-2xl font-black text-white">Queued messages on this device</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nothing is ever lost: every booking is stored here until the relay confirms delivery, and
                  re-sent automatically when the visitor returns or the connection comes back.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleFlush}
                  disabled={isFlushing || outbox.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {isFlushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Retry all now
                </button>
                <button
                  onClick={() => {
                    clearOutbox();
                    refresh();
                  }}
                  disabled={outbox.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs hover:border-red-500/40 transition-all disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear queue
                </button>
              </div>
            </div>

            {flushSummary && (
              <p className="mt-4 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3">
                Attempted <strong className="text-white">{flushSummary.attempted ?? flushSummary.results.length}</strong>,
                delivered <strong className="text-emerald-400">{flushSummary.delivered}</strong>, still queued{" "}
                <strong className="text-amber-300">{flushSummary.pending ?? getOutbox().length}</strong>.
              </p>
            )}

            {outbox.length === 0 ? (
              <p className="mt-5 text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-2xl p-4">
                The queue is empty — every message has been accepted by a relay. 🎉
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {outbox.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white font-mono">{entry.reference || entry.id}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {entry.message?.subject || 'Booking message'} • queued{' '}
                          {entry.queuedAt ? new Date(entry.queuedAt).toLocaleString('en-IN') : 'recently'} •
                          attempts {entry.attempts || 1}
                        </p>
                        {entry.lastDetail && (
                          <p className="text-[11px] text-amber-300/90 mt-1">{entry.lastDetail}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleRetrySingle(entry)}
                          disabled={isFlushing}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] disabled:opacity-60"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry
                        </button>
                        <a
                          href={mailtoHref(entry.message)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-bold text-[11px] hover:border-amber-500/40"
                        >
                          <Send className="w-3.5 h-3.5 text-amber-400" />
                          Mail app
                        </a>
                        <button
                          onClick={() => handleCopy(entry.id, `${entry.message?.subject}\n\n${entry.message?.text}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-bold text-[11px] hover:border-amber-500/40"
                        >
                          {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            removeQueuedMessage(entry.id);
                            refresh();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-bold text-[11px] hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 4. History + troubleshooting */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">History</p>
                  <h2 className="text-lg font-black text-white">Last delivery attempts</h2>
                </div>
                <button
                  onClick={() => {
                    clearDeliveryLog();
                    refresh();
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-400 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>

              {log.length === 0 ? (
                <p className="mt-4 text-xs text-slate-400">No attempts recorded in this browser yet.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {[...log].reverse().map((entry, index) => (
                    <li key={`${entry.at}-${index}`} className="text-[11px] text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <span className={`font-bold ${entry.ok ? 'text-emerald-400' : 'text-amber-300'}`}>
                        {entry.ok ? 'DELIVERED' : 'QUEUED'}
                      </span>{" "}
                      <span className="font-mono">{entry.reference}</span> • {entry.kind} •{' '}
                      {new Date(entry.at).toLocaleString('en-IN')}
                      <span className="block text-slate-400 mt-0.5">{entry.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Checklist</p>
              <h2 className="text-lg font-black text-white">If mails still do not arrive</h2>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-300">
                <li>✔️ Search the inbox for <span className="font-mono text-amber-300">Activate Form</span> and click it — until then FormSubmit silently drops messages.</li>
                <li>✔️ Look in <strong>Spam</strong>, <strong>Promotions</strong> and <strong>All Mail</strong>; mark Grid Master “Not spam” once.</li>
                <li>✔️ Check Gmail filters/blocked addresses for the recipient inbox.</li>
                <li>✔️ Confirm the address has no typing mistake (the test above shows the exact inbox used).</li>
                <li>✔️ Make sure the visitor pressed the button on the live https:// website — the relay refuses pages opened as local files.</li>
                <li>✔️ Corporate inboxes with strict filters: add a CC address or configure the server relay (Resend/SendGrid/Brevo) for the cleanest delivery.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={callHref()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs hover:border-amber-500/40 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  {COMPANY_INFO.phoneDisplay}
                </a>
                <a
                  href={`mailto:${recipient}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs hover:border-amber-500/40 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  Open inbox
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
