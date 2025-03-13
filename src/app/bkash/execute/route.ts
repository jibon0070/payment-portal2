import getBkashToken from "@/lib/get-bkash-token";
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
async function executeBkash(data: z.infer<typeof schema>) {
  const token = await getBkashToken();

  const response = await fetch(
    process.env.BKASH_BASE_URL +
      "/checkout/payment/execute/" +
      encodeURI(data.paymentID),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": process.env.BKASH_APP_KEY!,
      },
    },
  ).then((r) => r.json());

  if (response.errorMessage) {
    throw new Error("[execute error] {$response->errorMessage}");
  }

  return response.trxID;
}
