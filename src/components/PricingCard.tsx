import Link from "next/link";
import { ShieldMark } from "@/components/icons/ShieldMark";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { Button } from "@/components/ui/Button";

// Per DESIGN.md pricing-card / pricing-card-dark. The `dark` variant
// inverts surface + text + CTA per design-system §1.5 (one dark surface
// per page max — only the "Max" tier qualifies).

interface PricingCardProps {
  name: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  /** "everything in X, plus:" header above the feature list */
  featuresHeader?: string;
  dark?: boolean;
}

export function PricingCard({
  name,
  price,
  priceSuffix,
  description,
  features,
  ctaLabel,
  ctaHref,
  featuresHeader,
  dark = false,
}: PricingCardProps) {
  const containerStyle = dark
    ? { backgroundColor: "var(--color-surface-dark)" }
    : { border: "1px solid var(--color-hairline)", backgroundColor: "var(--color-canvas)" };

  const nameClass = dark ? "text-on-dark" : "text-ink";
  const descriptionClass = dark ? "text-on-dark-mute" : "text-body";
  const priceClass = dark ? "text-on-dark" : "text-ink";
  const featureHeaderClass = dark ? "text-on-dark" : "text-ink";
  const featureTextClass = dark ? "text-on-dark-mute" : "text-charcoal";
  const dividerStyle = dark
    ? { borderTop: "1px solid rgba(255,255,255,0.15)" }
    : { borderTop: "1px solid var(--color-hairline)" };
  const checkColorClass = dark ? "text-on-dark" : "text-ink";

  return (
    <div className="flex flex-col rounded-lg p-xxl" style={containerStyle}>
      <div className={nameClass}>
        <ShieldMark size={32} />
      </div>
      <h3 className={`mt-lg text-heading-md font-display font-medium ${nameClass}`}>
        {name}
      </h3>
      <p className={`mt-xs text-body-sm ${descriptionClass}`}>{description}</p>
      <div className="mt-lg flex items-baseline gap-xs">
        <span className={`text-display-lg font-display font-medium ${priceClass}`}>
          {price}
        </span>
        {priceSuffix && (
          <span className={`text-body-sm ${descriptionClass}`}>{priceSuffix}</span>
        )}
      </div>

      <div className="mt-xl">
        {dark ? (
          <Link href={ctaHref} className="inline-flex w-full">
            <button
              type="button"
              className="inline-flex h-button w-full items-center justify-center rounded-full bg-canvas px-xl text-button-md font-medium text-ink"
            >
              {ctaLabel}
            </button>
          </Link>
        ) : (
          <Link href={ctaHref} className="inline-flex w-full">
            <Button className="w-full">{ctaLabel}</Button>
          </Link>
        )}
      </div>

      <div className="mt-xl pt-lg" style={dividerStyle}>
        {featuresHeader && (
          <p className={`text-body-sm font-medium ${featureHeaderClass}`}>{featuresHeader}</p>
        )}
        <ul className={`flex flex-col gap-sm ${featuresHeader ? "mt-md" : ""}`}>
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-md">
              <span className={`mt-xs shrink-0 ${checkColorClass}`}>
                <CheckIcon size={16} />
              </span>
              <span className={`text-body-sm ${featureTextClass}`}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
