import "server-only";
import { siteUrl } from "../env";

/*
 * Transactional email through Resend. Copy follows the Figma "9 · Emails" frames (60g, 60h, 60i).
 * Without RESEND_API_KEY (local and early previews) the email is printed to the server log instead.
 */
type Mail = { to: string; subject: string; html: string; text: string };

export async function sendEmail(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Depod <hello@depod.app>", ...mail }),
  });
  if (!res.ok) console.error(`[email] Resend failed ${res.status}: ${await res.text()}`);
}

const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#f7f7f7;font-family:Inter,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6e6e6;border-radius:24px">
<tr><td style="padding:40px">
<p style="margin:0 0 24px;font-size:20px;font-weight:600;letter-spacing:-0.3px">depod</p>
<h1 style="margin:0 0 12px;font-size:20px;font-weight:500">${title}</h1>
${body}
</td></tr></table>
<p style="margin:24px 0 0;font-size:12px;color:#b5b5b5">Depod · Unsubscribe from summaries in Preferences</p>
</td></tr></table></body></html>`;

const p = (s: string, muted = true) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.45;color:${muted ? "#8a8a8a" : "#0a0a0a"}">${s}</p>`;

/** 60g Verification code email. */
export function codeEmail(to: string, code: string): Mail {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    to,
    subject: `Your Depod code: ${spaced}`,
    html: shell(
      "Your sign-in code",
      p("Enter this code to finish signing in. It expires in 10 minutes.") +
        `<p style="margin:8px 0 24px;font-size:32px;font-weight:500;letter-spacing:4px">${spaced}</p>` +
        p("Didn't try to sign in? You can ignore this email. Nobody gets in without the code."),
    ),
    text: `Your sign-in code: ${spaced}\nEnter this code to finish signing in. It expires in 10 minutes.\nDidn't try to sign in? You can ignore this email. Nobody gets in without the code.`,
  };
}

type SignIn = { device: string; browser: string; city: string | null; country: string | null; ip: string | null; at: Date };

/** 60h New sign-in alert. */
export function signInAlertEmail(to: string, s: SignIn): Mail {
  const place = [s.city, s.country].filter(Boolean).join(", ") || "Unknown";
  const time = s.at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) + " WAT";
  const rows: Array<[string, string]> = [
    ["Device", `${s.browser} on ${s.device}`],
    ["Location", `${place} (approximate)`],
    ["IP address", s.ip ?? "Unknown"],
    ["Time", time],
  ];
  const table = `<table role="presentation" width="100%" style="margin:0 0 24px;font-size:15px">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#8a8a8a;width:120px">${k}</td><td style="padding:6px 0">${v}</td></tr>`)
    .join("")}</table>`;
  const link = `${siteUrl()}/settings/security`;
  return {
    to,
    subject: "New sign-in to your Depod account",
    html: shell(
      "New sign-in to your account",
      p("Your Depod account was just signed in to from a new device.") +
        table +
        p("Was this you? You don't need to do anything.", false) +
        p("Wasn't you?") +
        `<a href="${link}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:500;padding:10px 16px;border-radius:10px">Secure my account</a>`,
    ),
    text: `New sign-in to your Depod account\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\nWasn't you? Secure your account: ${link}`,
  };
}

/** 60i Security change email. `change` is e.g. { title: "Authenticator app removed", subject: "The authenticator app was removed from your Depod account", sentence: "The authenticator app was removed from your account", after: "Sign-in now uses email codes." } */
export function securityChangeEmail(
  to: string,
  change: { title: string; subject: string; sentence: string; after?: string },
  s: Omit<SignIn, "ip">,
): Mail {
  const place = [s.city, s.country].filter(Boolean).join(", ");
  const day = s.at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  const time = s.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
  const line = `${change.sentence} on ${day} at ${time} from ${s.browser} on ${s.device}${place ? ` in ${place}` : ""}.${change.after ? ` ${change.after}` : ""}`;
  const link = `${siteUrl()}/settings/security`;
  return {
    to,
    subject: change.subject,
    html: shell(
      change.title,
      p(line) + `<a href="${link}" style="font-size:15px;color:#0a0a0a">Wasn't you?</a>`,
    ),
    text: `${change.title}\n${line}\nWasn't you? ${link}`,
  };
}
