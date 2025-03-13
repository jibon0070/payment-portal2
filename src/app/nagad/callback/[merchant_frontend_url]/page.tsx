import getServerToken from "@/lib/get-server-token";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

const responseSuccessSchema = z.object({
  status: z.literal("Success"),
  additionalMerchantInfo: z.object({
    service: z.string().min(1),
    token: z.string().min(1),
    amount: z.coerce.number().nonnegative(),
    package: z.string().min(1),
    refer_code: z.string().optional().default(""),
  }),
  issuerPaymentRefNo: z.string().min(1),
  paymentRefId: z.string().min(1),
});

type Props = {
  searchParams: Promise<unknown>;
  params: Promise<unknown>;
};

export default async function Callback(props: Props) {
  let params;
  let nagadResponse: Awaited<ReturnType<typeof getNagadResponse>>;
  try {
    const data = await parseData(props);
    const searchParams = data.searchParams;
    params = data.params;

    nagadResponse = await getNagadResponse(searchParams.payment_ref_id);
    await processBackendData(nagadResponse);
  } catch (e) {
    if (e instanceof Error) {
      const url = new URL(
        await props.params.then((params) => {
          return decodeURIComponent(
            (params as Record<string, string>).merchant_frontend_url,
          );
        }),
      );
      url.searchParams.append("status", "error");
      url.searchParams.append("message", e.message);
      redirect(url.toString());
    }
    notFound();
  }
  const url = new URL(decodeURIComponent(params.merchant_frontend_url));
  url.searchParams.append("status", "success");
  url.searchParams.append("token", nagadResponse!.additionalMerchantInfo.token);
  redirect(url.toString());
}

async function parseData(props: Props) {
  const params = z
    .object({ merchant_frontend_url: z.string().min(1) })
    .parse(await props.params);

  const searchParams = z
    .discriminatedUnion("status", [
      z.object({
        status: z.literal("Success"),
        payment_ref_id: z.string().min(1),
      }),
      z.object({
        status: z.enum(["Aborted", "Failed"]),
        payment_ref_id: z.string().min(1),
        message: z.string().min(1),
      }),
    ])

    .parse(await props.searchParams);

  if (searchParams.status !== "Success") {
    throw new Error(searchParams.message);
  }

  return { params, searchParams };
}

async function getNagadResponse(
  paymentRefId: string,
): Promise<z.infer<typeof responseSuccessSchema>> {
  const networkResponse = await fetch(
    `${process.env.NAGAD_BASE_URL}/verify/payment/${paymentRefId}`,
  )
    .then((r) => r.json())
    .then((data) => {
      if (data.status === "Success") {
        data.additionalMerchantInfo = JSON.parse(data.additionalMerchantInfo);
      }
      return data;
    });

  const nagadResponse = z
    .discriminatedUnion("status", [
      responseSuccessSchema,
      z.object({
        status: z.enum(["Aborted", "Failed"]),
      }),
    ])
    .parse(networkResponse);

  if (nagadResponse.status !== "Success") {
    throw new Error("Unknown error");
  }

  return nagadResponse;
}

async function processBackendData(
  nagadResponse: z.infer<typeof responseSuccessSchema>,
) {
  const additionalInfo = nagadResponse.additionalMerchantInfo;

  const process_extra_data_body =
    additionalInfo.service === "premium"
      ? {
          transaction_id: nagadResponse.issuerPaymentRefNo,
          token: additionalInfo.token,
          amount: additionalInfo.amount,
          package: additionalInfo.package,
          type: "Nagad",
          payment_ref_id: nagadResponse.paymentRefId,
          service: additionalInfo.service,
          refer_code: additionalInfo.refer_code,
        }
      : {
          transaction_id: nagadResponse.issuerPaymentRefNo,
          token: additionalInfo.token,
          amount: additionalInfo.amount,
          type: "Nagad",
          payment_ref_id: nagadResponse.paymentRefId,
          service: additionalInfo.service,
        };
  const merchant_response = await fetch(`${process.env.BACKEND_PROCESS_URL}`, {
    method: "POST",
    body: JSON.stringify(process_extra_data_body),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${getServerToken()}`,
    },
  }).then((r) => r.json());

  if (!merchant_response.success) {
    throw new Error(`[callback error] ${merchant_response.message}`);
  }
}
