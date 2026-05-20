import { Resend } from "resend";
import { render } from "@react-email/render";
import { env } from "@/lib/env";
import { FROM_ADDRESS } from "@/lib/constants";
import { VerifyEmail } from "@/emails/verify-email";

// All Resend interaction goes through this module. Per react-email-templates
// skill §2 + §9: send both html and text variants; guard console.error with
// NODE_ENV so PII (recipient address) is not logged in production; throw on
// failure so the calling route can catch and respond gracefully.

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
}) {
  const element = (
    <VerifyEmail name={params.name} verifyUrl={params.verifyUrl} />
  );
  const html = await render(element);
  const text = await render(element, { plainText: true });

  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: "Verify your SecureGate email",
    html,
    text,
    headers: {
      // Gmail's 2024+ sender requirements honor List-Unsubscribe even for
      // transactional mail. The mailto target should be a real monitored
      // address once we cut over to the production domain.
      "List-Unsubscribe": "<mailto:unsubscribe@securegate.dev>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[email/verify] send failed", { error, to: params.to });
    }
    throw new Error("Email send failed");
  }
  return data;
}
