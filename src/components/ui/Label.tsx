interface LabelProps {
  htmlFor: string;
  children: React.ReactNode;
}

export function Label({ htmlFor, children }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="block text-body-sm font-medium text-ink">
      {children}
    </label>
  );
}
