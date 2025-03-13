import { z } from "zod";

const schema = z.object({
  paymentID: z.string().min(1, "paymentID is required. [execute]"),
  token: z.string().min(1, "token is required. [execute]"),
  amount: z.coerce
    .number()
    .nonnegative("Amount must be a positive number. [execute]"),
  package: z.string().min(1, "package is required. [execute]"),
  service: z.string().min(1, "service is required. [execute]"),
  refer_code: z.string().optional().default(""),
});
