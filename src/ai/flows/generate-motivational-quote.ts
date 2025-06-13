// src/ai/flows/generate-motivational-quote.ts
'use server';

/**
 * @fileOverview Generates motivational quotes for gym members upon check-in.
 *
 * - generateMotivationalQuote - A function that generates a motivational quote.
 * - MotivationalQuoteInput - The input type for the generateMotivationalQuote function.
 * - MotivationalQuoteOutput - The return type for the generateMotivationalQuote function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MotivationalQuoteInputSchema = z.object({
  memberId: z.string().describe('The ID of the gym member.'),
  memberName: z.string().describe('The name of the gym member.'),
});
export type MotivationalQuoteInput = z.infer<typeof MotivationalQuoteInputSchema>;

const MotivationalQuoteOutputSchema = z.object({
  quote: z.string().describe('A motivational quote for the gym member.'),
});
export type MotivationalQuoteOutput = z.infer<typeof MotivationalQuoteOutputSchema>;

export async function generateMotivationalQuote(input: MotivationalQuoteInput): Promise<MotivationalQuoteOutput> {
  return generateMotivationalQuoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'motivationalQuotePrompt',
  input: {schema: MotivationalQuoteInputSchema},
  output: {schema: MotivationalQuoteOutputSchema},
  prompt: `You are a motivational expert. Generate a short motivational quote for gym member {{memberName}} (ID: {{memberId}}) to encourage them in their fitness journey.`,
});

const generateMotivationalQuoteFlow = ai.defineFlow(
  {
    name: 'generateMotivationalQuoteFlow',
    inputSchema: MotivationalQuoteInputSchema,
    outputSchema: MotivationalQuoteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
