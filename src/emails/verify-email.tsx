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

// Per react-email-templates skill §3. <Heading as="h1"> explicit per skill §11.

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Confirm your email address to finish setting up your SecureGate account.
      </Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Heading as="h1" style={s.heading}>
            Welcome to SecureGate
          </Heading>
          <Text style={s.text}>Hi {name},</Text>
          <Text style={s.text}>
            Thanks for signing up. Please confirm your email address by clicking the button
            below. This link will expire in 15 minutes.
          </Text>
          <Section style={s.buttonContainer}>
            <Button href={verifyUrl} style={s.button}>
              Verify email
            </Button>
          </Section>
          <Text style={s.textSmall}>Or copy and paste this link into your browser:</Text>
          <Text style={s.link}>{verifyUrl}</Text>
          <Hr style={s.hr} />
          <Text style={s.footer}>
            If you didn&apos;t create a SecureGate account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default VerifyEmail;
