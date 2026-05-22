// Per DESIGN.md faq-row: heading-sm question in ink, body-md answer in
// body, 16px vertical padding with 1px bottom hairline. Always expanded
// — no accordion collapse.

interface FAQRowProps {
  question: string;
  children: React.ReactNode;
}

export function FAQRow({ question, children }: FAQRowProps) {
  return (
    <div
      className="py-lg"
      style={{ borderBottom: "1px solid var(--color-hairline)" }}
    >
      <h3 className="text-heading-sm font-display font-medium text-ink">{question}</h3>
      <p className="mt-xs text-body-md text-body">{children}</p>
    </div>
  );
}
