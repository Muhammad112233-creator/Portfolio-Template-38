'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { site } from '@/content/site';
import AsciiNight from './AsciiNight';
import styles from './Contact.module.scss';

/**
 * The form posts to Web3Forms (https://web3forms.com), which forwards each
 * message to your inbox, so the site needs no server of its own. Put your
 * access key in NEXT_PUBLIC_WEB3FORMS_KEY (see .env.example). Until then the
 * form runs in demo mode and says so, rather than pretending to send.
 */
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? '';
const CAPTCHA_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? '';
const ENDPOINT = 'https://api.web3forms.com/submit';

type State = 'idle' | 'sending' | 'success' | 'error' | 'invalid' | 'demo';

type Captcha = {
  render: (container: HTMLElement, options: { sitekey: string; size: 'invisible' }) => string;
  execute: (id: string, options: { async: true }) => Promise<{ response: string }>;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    hcaptcha?: Captcha;
  }
}

let captchaScript: Promise<void> | null = null;
function loadCaptcha() {
  captchaScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      captchaScript = null;
      reject(new Error('hCaptcha failed to load'));
    };
    document.head.append(script);
  });
  return captchaScript;
}

export default function Contact() {
  const { contact } = site;
  const id = useId();
  const [state, setState] = useState<State>('idle');
  const captchaBox = useRef<HTMLDivElement>(null);
  const captchaId = useRef<string | null>(null);
  const statusTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(statusTimer.current), []);

  // the captcha is only fetched once someone actually starts writing
  const prepareCaptcha = async () => {
    if (!CAPTCHA_KEY || captchaId.current || !captchaBox.current) return;
    try {
      await loadCaptcha();
      if (window.hcaptcha && !captchaId.current) {
        captchaId.current = window.hcaptcha.render(captchaBox.current, { sitekey: CAPTCHA_KEY, size: 'invisible' });
      }
    } catch {
      /* the submit handler reports the problem */
    }
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const project = String(data.get('message') ?? '').trim();
    window.clearTimeout(statusTimer.current);

    if (data.get('botcheck')) return; // a bot filled the hidden box
    if (!name || !project || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setState('invalid');
      return;
    }
    if (!ACCESS_KEY) {
      setState('demo');
      return;
    }

    setState('sending');
    try {
      const payload: Record<string, string> = {
        access_key: ACCESS_KEY,
        subject: `New brief from ${name}`,
        from_name: site.person.name,
        name,
        email,
        message: project,
      };
      if (CAPTCHA_KEY) {
        await prepareCaptcha();
        if (!window.hcaptcha || !captchaId.current) throw new Error('captcha unavailable');
        const { response } = await window.hcaptcha.execute(captchaId.current, { async: true });
        payload['h-captcha-response'] = response;
      }
      const reply = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await reply.json().catch(() => null)) as { success?: boolean } | null;
      if (!reply.ok || !result?.success) throw new Error('rejected');
      form.reset();
      setState('success');
      statusTimer.current = window.setTimeout(() => setState('idle'), 9000);
    } catch {
      setState('error');
    } finally {
      if (captchaId.current) window.hcaptcha?.reset(captchaId.current);
    }
  };

  const message =
    state === 'sending'
      ? contact.sending
      : state === 'success'
        ? contact.success
        : state === 'error'
          ? contact.error
          : state === 'invalid'
            ? contact.invalid
            : state === 'demo'
              ? contact.demo
              : '';

  return (
    <section
      className={styles.contact}
      id="contact"
      aria-labelledby={`${id}-title`}
      data-scene="contact"
      data-anchor="contact"
      data-nav-section="contact"
      data-nav-line="0.35"
      data-nav-theme="dark"
    >
      <AsciiNight />

      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>{contact.eyebrow}</p>
          <h2 className={styles.title} id={`${id}-title`}>
            {contact.title.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className={styles.lead}>{contact.lead}</p>
        </header>

        <div className={styles.conversation}>
          <form className={styles.form} data-state={state} noValidate onSubmit={onSubmit} onFocus={prepareCaptcha}>
            <input className={styles.honeypot} type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <label className={styles.field}>
              <span className={styles.fieldMeta}>{contact.fields.name.label}</span>
              <input name="name" type="text" autoComplete="name" required placeholder={contact.fields.name.placeholder} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldMeta}>{contact.fields.email.label}</span>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck={false}
                required
                placeholder={contact.fields.email.placeholder}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldMeta}>{contact.fields.project.label}</span>
              <textarea name="message" rows={2} required placeholder={contact.fields.project.placeholder} />
            </label>

            <button className={styles.submit} type="submit" disabled={state === 'sending'}>
              <span className={styles.submitLabel}>{state === 'sending' ? contact.sending : contact.submit}</span>
              <span className={styles.submitMark} aria-hidden="true">
                <span className={styles.submitArrow}>↗</span>
              </span>
            </button>

            {CAPTCHA_KEY ? (
              <>
                <div ref={captchaBox} />
                <p className={styles.disclosure}>
                  This form is protected by hCaptcha. Its{' '}
                  <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a href="https://www.hcaptcha.com/terms" target="_blank" rel="noreferrer">
                    Terms of Service
                  </a>{' '}
                  apply.
                </p>
              </>
            ) : null}

            <output className={styles.status} aria-live="polite">
              {message}
            </output>
          </form>
        </div>

        <ul className={styles.socials}>
          {contact.socials.map((social) => (
            <li key={social.label}>
              <a href={social.href} target="_blank" rel="noreferrer">
                <span className={styles.socialWord}>{social.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.meadow} aria-hidden="true" />
    </section>
  );
}
