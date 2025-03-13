import getBkashToken from "@/lib/get-bkash-token";
import getServerToken from "@/lib/get-server-token";
import ResponseWraper from "@/types/response-wraper";
import { NextRequest } from "next/server";
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

export async function POST(req: NextRequest) {
  const data = schema.parse(await req.json());

  const txId = await executeBkash(data);
  const backResponse = await processBackend(data, txId);

  if (!backResponse.success) return Response.json(backResponse);

  return Response.json({ success: true, token: backResponse.token });
}

async function processBackend(
  data: z.infer<typeof schema>,
  trxID: string,
): Promise<ResponseWraper<{ token: string }>> {
  const body = JSON.stringify(
    data.service === "premium"
      ? {
          transaction_id: trxID,
          token: data.token,
          amount: data.amount,
          package: data.package,
          type: "bKash",
          payment_ref_id: data.paymentID,
          service: data.service,
          refer_code: data.refer_code,
        }
      : {
          transaction_id: trxID,
          token: data.token,
          amount: data.amount,
          type: "bKash",
          payment_ref_id: data.paymentID,
          service: data.service,
        },
  );
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getServerToken()}`,
  };

  const response = await fetch(`${process.env.BACKEND_PROCESS_URL}`, {
    method: "POST",
    body,
    headers,
  }).then((r) => r.json());
  return response;
}

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
