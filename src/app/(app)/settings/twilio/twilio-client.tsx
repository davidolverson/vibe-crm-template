'use client';

import { useState, useTransition } from 'react';
import { Check, Plus, Trash2, Phone } from 'lucide-react';
import {
  saveTwilioCredentials,
  addPhoneNumber,
  removePhoneNumber,
  setDefaultPhone,
  disconnectTwilio,
} from './actions';

interface Phone {
  id: string;
  phoneNumber: string;
  twilioSid: string;
  friendlyName: string | null;
  isDefault: boolean;
  createdAt: string;
}

export function TwilioSettingsClient(props: {
  connected: boolean;
  twimlAppSid: string | null;
  phones: Phone[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Credentials form
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');

  // Phone form
  const [newPhone, setNewPhone] = useState('');
  const [newSid, setNewSid] = useState('');
  const [friendlyName, setFriendlyName] = useState('');
  const [makeDefault, setMakeDefault] = useState(props.phones.length === 0);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveTwilioCredentials(sid, token);
      if (!r.success) return flash(r.error);
      setSid('');
      setToken('');
      flash('Connected');
    });
  }

  function handleAddPhone(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await addPhoneNumber(newPhone, newSid, friendlyName || null, makeDefault);
      if (!r.success) return flash(r.error);
      setNewPhone('');
      setNewSid('');
      setFriendlyName('');
      flash('Phone added');
    });
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      {/* Status */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Status</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {props.connected ? (
                <>
                  Connected.{' '}
                  {props.twimlAppSid
                    ? 'Voice SDK configured.'
                    : 'Voice SDK not yet configured (click-to-call disabled).'}
                </>
              ) : (
                'Not connected. Paste your Master Account credentials below.'
              )}
            </p>
          </div>
          <span
            className={[
              'inline-block h-2 w-2 rounded-full',
              props.connected ? 'bg-emerald-400' : 'bg-zinc-600',
            ].join(' ')}
          />
        </div>
      </section>

      {/* Credentials */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Twilio credentials</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Stored encrypted. Only used server-side. Get these from the{' '}
          <a
            href="https://console.twilio.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[#D4A017] underline-offset-4 hover:underline"
          >
            Twilio Console
          </a>
          .
        </p>
        <form onSubmit={handleSaveCreds} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Account SID</label>
            <input
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={!props.canEdit || pending}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Auth Token</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={!props.canEdit || pending}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!props.canEdit || pending || !sid || !token}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              {props.connected ? 'Update' : 'Connect'}
            </button>
            {props.connected && (
              <button
                type="button"
                onClick={() => {
                  if (!confirm('Disconnect Twilio? All phone numbers will be removed.')) return;
                  startTransition(async () => {
                    const r = await disconnectTwilio();
                    if (!r.success) return flash(r.error);
                    flash('Disconnected');
                  });
                }}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Disconnect
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Phone numbers */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Phone numbers</h2>
        <p className="mb-4 text-xs text-zinc-500">
          After buying a number in Twilio, paste it here along with its Twilio SID. The default number is used
          for outbound SMS.
        </p>

        <div className="mb-4 space-y-2">
          {props.phones.length === 0 ? (
            <p className="text-xs text-zinc-600">No phone numbers yet.</p>
          ) : (
            props.phones.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-white">{p.phoneNumber}</div>
                    <div className="text-xs text-zinc-500">
                      {p.friendlyName ? `${p.friendlyName} · ` : ''}
                      {p.twilioSid.slice(0, 10)}...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.isDefault ? (
                    <span className="rounded-full bg-[#D4A017]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#D4A017]">
                      default
                    </span>
                  ) : (
                    <button
                      disabled={!props.canEdit || pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await setDefaultPhone(p.id);
                          if (!r.success) return flash(r.error);
                          flash('Default updated');
                        })
                      }
                      className="text-xs text-zinc-400 hover:text-[#D4A017]"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    disabled={!props.canEdit || pending}
                    onClick={() => {
                      if (!confirm(`Remove ${p.phoneNumber}?`)) return;
                      startTransition(async () => {
                        const r = await removePhoneNumber(p.id);
                        if (!r.success) return flash(r.error);
                        flash('Removed');
                      });
                    }}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {props.connected && (
          <form onSubmit={handleAddPhone} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+14155551234"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={!props.canEdit || pending}
            />
            <input
              value={newSid}
              onChange={(e) => setNewSid(e.target.value)}
              placeholder="PNxxxxxxxxxxxxxx"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={!props.canEdit || pending}
            />
            <input
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              placeholder="Friendly name (optional)"
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017] sm:col-span-2"
              disabled={!props.canEdit || pending}
            />
            <label className="inline-flex items-center gap-2 text-xs text-zinc-400 sm:col-span-2">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                disabled={!props.canEdit || pending}
              />
              Make this the default number
            </label>
            <button
              type="submit"
              disabled={!props.canEdit || pending || !newPhone || !newSid}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40 sm:col-span-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add phone
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
