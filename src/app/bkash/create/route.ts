import getBkashToken from "@/lib/get-bkash-token";
import getRandomNumber from "@/lib/get-random-number";
import getServerToken from "@/lib/get-server-token";
import ResponseWraper from "@/types/response-wraper";
import { NextRequest } from "next/server";
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

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json());

    await checkExtraData(data);

    const token: string = await getBkashToken();

    const invoice = `${Date.now()}${getRandomNumber(0, 9999)}`;

    const headers = {
      Accept: "application/json",
      Authorization: token,
      "Content-Type": "application/json",
      "X-APP-Key": process.env.BKASH_APP_KEY!,
    };

    const body = JSON.stringify({
      amount: data.amount,
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: invoice,
    });

    const response = await fetch(
      `${process.env.BKASH_BASE_URL}/checkout/payment/create`,
      { method: "POST", body, headers },
    ).then((r) => r.json());

    console.log(response);

    return Response.json({ success: true, response });
  } catch (e) {
    return Response.json({
      success: false,
      message: e instanceof Error ? e.message : e,
    });
  }
}

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
