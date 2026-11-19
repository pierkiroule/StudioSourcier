import { z } from "zod";
export const AudioUrlSchema = z.union([
  z.literal(""),
  z
    .string()
    .regex(
      /^asset:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  z
    .url()
    .refine(
      (s) => new URL(s).protocol === "https:",
      "Une URL audio HTTPS est requise",
    ),
]);
export const MediaResourceSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("https"),
    url: z.url().refine((s) => new URL(s).protocol === "https:"),
  }),
  z.object({ provider: z.literal("r2"), key: z.string().min(1) }),
]);
export type MediaResource = z.infer<typeof MediaResourceSchema>;
export interface MediaResolver {
  resolve(resource: MediaResource): Promise<string>;
}
/** Backend authorizes resource access before returning an ephemeral signed URL. */
export class SecureMediaResolver implements MediaResolver {
  constructor(private authorize: (key: string) => Promise<string>) {}
  async resolve(input: MediaResource) {
    const resource = MediaResourceSchema.parse(input);
    return resource.provider === "https"
      ? resource.url
      : z
          .url()
          .refine((s) => new URL(s).protocol === "https:")
          .parse(await this.authorize(resource.key));
  }
}
