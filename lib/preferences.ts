import {z} from 'zod';
import {pencilColors} from './pencil-model';

export const preferencesSchema = z.object({
  pencilMeanings:z.record(z.enum(pencilColors),z.string().min(1).max(80)).optional(),
  fontSize: z.number().min(16).max(30),
  lineHeight: z.number().min(1.5).max(2.4),
  theme: z.enum(['paper', 'sepia', 'night']),
  numbers: z.boolean(),
  characters: z.boolean(),
  font: z.enum(['sans', 'serif']),
  // Older device data and backups keep their existing automatic resume behavior.
  autoBookmark: z.boolean().default(true),
});
export type Prefs = z.infer<typeof preferencesSchema>;
export const defaultPrefs: Prefs = {fontSize:20, lineHeight:1.85, theme:'paper', numbers:true, characters:true, font:'sans', autoBookmark:true};
