import {z} from 'zod';

export const preferencesSchema = z.object({
  fontSize: z.number().min(16).max(30),
  lineHeight: z.number().min(1.5).max(2.4),
  theme: z.enum(['paper', 'sepia', 'night']),
  numbers: z.boolean(),
  characters: z.boolean(),
  font: z.enum(['sans', 'serif']),
});
export type Prefs = z.infer<typeof preferencesSchema>;
export const defaultPrefs: Prefs = {fontSize:20, lineHeight:1.85, theme:'paper', numbers:true, characters:true, font:'sans'};
