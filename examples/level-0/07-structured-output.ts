// Lesson 0.2: when you only want JSON back, do not fake a tool. Use structured outputs.
// Run: bun run examples/level-0/07-structured-output.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";

const Contact = z.object({
  name: z.string(),
  email: z.string(),
  company: z.string(),
});

const signature = `
Best regards,
Dana Okafor
Head of Platform, Northwind Labs
dana.okafor@northwind.example | +1 555 0100
`;

// parse() sends the schema as output_config.format and validates the reply against it.
const response = await client.messages.parse({
  model: MODEL,
  max_tokens: 1024,
  messages: [{ role: "user", content: `Extract the contact from this email signature:\n${signature}` }],
  output_config: { format: zodOutputFormat(Contact) },
});

console.log(response.parsed_output); // typed as { name: string; email: string; company: string } | null
