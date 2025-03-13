import { z } from "zod";

const schema = z
  .object({
    token: z.string().min(1, "Token is required. [create]"),
    amount: z.coerce
      .number({ message: "Amount is required. [create]" })
      .nonnegative("Amount must be a positive number. [create]"),
    service: z.string().min(1, "Service is required. [create]"),
    package: z.string().optional().default(""),
    refer_code: z.string().optional().default(""),
  })
  .refine((data) => !(data.service === "premium" && !data.package), {
    message: "Package is required. [create]",
    path: ["package"],
  });
