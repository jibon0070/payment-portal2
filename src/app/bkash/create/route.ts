import getServerToken from "@/lib/get-server-token";
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

async function checkExtraData(data: z.infer<typeof schema>) {
  const body =
    data.service === "premium"
      ? {
          token: data.token,
          amount: data.amount,
          package: data.package,
          service: data.service,
          refer_code: data.refer_code,
        }
      : { token: data.token, amount: data.amount, service: data.service };

  const r: ResponseWraper = await fetch(process.env.BACKEND_CHECK_URL!, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getServerToken()}`,
      Accept: "application/json",
    },
  }).then((r) => r.json());

  if (!r.success) {
    throw new Error(r.message);
  }
}
