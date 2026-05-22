// Per DESIGN.md terminal-card: hairline border, p-lg, rounded-lg,
// macOS traffic-light dots in the header (red/yellow/green at 12px),
// then a <pre> body in font-mono code-sm.

interface TerminalCardProps {
  children: React.ReactNode;
}

export function TerminalCard({ children }: TerminalCardProps) {
  return (
    <div
      className="rounded-lg bg-canvas p-lg"
      style={{ border: "1px solid var(--color-hairline)" }}
    >
      <div className="flex items-center gap-xs" aria-hidden="true">
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: 9999,
            backgroundColor: "var(--color-terminal-red)",
          }}
        />
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: 9999,
            backgroundColor: "var(--color-terminal-yellow)",
          }}
        />
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            borderRadius: 9999,
            backgroundColor: "var(--color-terminal-green)",
          }}
        />
      </div>
      <pre className="mt-lg overflow-x-auto whitespace-pre font-mono text-code-sm text-ink">
        {children}
      </pre>
    </div>
  );
}
