import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as s from "./_styles";

// Per react-email-templates skill §4. Styles imported from the shared
// _styles module so this template and verify-email don't drift.
//
// The footer is intentionally longer than the verification email's: reset
// emails sometimes reach people who didn't request one (typo / fishing),
// and the explicit "your password won't change unless you click" line
// reduces panic and support burden.

interface ResetPasswordProps {
  name: string;
  resetUrl: string;
}

export function ResetPassword({ name, resetUrl }: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your SecureGate password. This link expires in 1 hour.</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading as="h1" style={s.heading}>
            Reset your password
          </Heading>
          <Text style={s.text}>Hi {name},</Text>
          <Text style={s.text}>
            We received a request to reset your password. Click the button below to choose a new
            one. This link will expire in 1 hour.
          </Text>
          <Section style={s.buttonContainer}>
            <Button href={resetUrl} style={s.button}>
              Reset password
            </Button>
          </Section>
          <Text style={s.textSmall}>Or copy and paste this link into your browser:</Text>
          <Text style={s.link}>{resetUrl}</Text>
          <Hr style={s.hr} />
          <Text style={s.footer}>
            If you didn&apos;t request a password reset, you can safely ignore this email. Your
            password will not change unless you click the link above.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ResetPassword;
