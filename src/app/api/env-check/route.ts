import { NextResponse } from "next/server";

// TEMPORARY diagnostic route for the AWS Amplify deployment investigation.
// Reports only whether each variable is present — never the actual value.
// Delete this file once the deployment env-var issue is confirmed fixed.
export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
    hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
    nextAuthUrlValue: process.env.NEXTAUTH_URL ?? null,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasOpenAiModel: Boolean(process.env.OPENAI_MODEL),
  });
}
