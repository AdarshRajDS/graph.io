import { z } from "zod";

const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: optionalUrl,
  API_INTERNAL_URL: optionalUrl,
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  return envSchema.parse({
    NEXT_PUBLIC_API_URL: source.NEXT_PUBLIC_API_URL,
    API_INTERNAL_URL: source.API_INTERNAL_URL,
  });
}
