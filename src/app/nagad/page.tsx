import getRandomNumber from "@/lib/get-random-number";
import getServerToken from "@/lib/get-server-token";
import ResponseWraper from "@/types/response-wraper";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { headers } from "next/headers";
import NodeRSA from "node-rsa";

export const metadata: Metadata = {
  title: "Nagad Payment Portal",
  icons: "/nagad-logo.png",
};

const schema = z
  .object({
    merchant_frontend_url: z.string().min(1),
    token: z.string().min(1),
    amount: z.coerce.number().nonnegative(),
    service: z.string().min(1),
    package: z.string().optional().default(""),
    refer_code: z.string().optional().default(""),
  })
  .refine((data) => !(data.service === "premium" && !data.package));

export default async function Nagad(props: { searchParams: Promise<unknown> }) {
  let data: z.infer<typeof schema>;

  try {
    data = schema.parse(await props.searchParams);
  } catch {
    notFound();
  }

  const nagadUrl = await getNagadUrl(data);

  return (
    <main className="h-screen flex justify-center items-center">
      <a href={nagadUrl} className="btn">
        Tap to pay with nagad
      </a>
    </main>
  );
}

async function getNagadUrl(data: z.infer<typeof schema>): Promise<string> {
  await checkExtraData(data);
  const order_id = `Nagad00${Math.floor(Date.now() / 1000)}${getRandomNumber(0, 9)}`;
  const sensitive_data = {
    merchantId: process.env.NAGAD_MERCHANT_ID,
    datetime: get_date_time(),
    orderId: order_id,
    challenge: random_string(),
  };

  const checkout_init_data = {
    dateTime: get_date_time(),
    sensitiveData: encrypt_data_with_public_key(sensitive_data),
    signature: generate_signature(sensitive_data),
  };

  const language = "EN";

  //http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs/check-out/initialize/{merchantId}/{orderId}

  //$url = BASE_URL . '/remote-payment-gateway-1.0/api/dfs/checkout/initialize/' . MERCHANT_ID . '/' . $order_id . "?locale=" . $language;
  const base_url = process.env.NAGAD_BASE_URL;
  const merchant_id = process.env.NAGAD_MERCHANT_ID;

  let response: Record<string, unknown>;
  try {
    response = await fetch(
      `${base_url}/check-out/initialize/${merchant_id}/${order_id}?locale=${language}`,
      {
        body: JSON.stringify(checkout_init_data),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-KM-Api-Version": "v-0.2.0",
          "X-KM-IP-V4": await get_ip_address(),
          "X-KM-Client-Type": "PC_WEB",
        },
      },
    ).then((response) => response.json());
  } catch (e) {
    console.trace(e);
    throw new Error("nagad server error [get url]");
  }

  if (!response.sensitiveData) {
    throw new Error(response.devMessage as string);
  }

  if (!response.sensitiveData || !response.signature) {
    throw new Error("serviceFee");
  }

  const decrypted_response = JSON.parse(
    decrypt_data_with_private_key(response.sensitiveData as string),
  ) as Record<string, unknown>;

  if (!decrypted_response.paymentReferenceId || !decrypted_response.challenge) {
    throw Error("Invalid response[get url]");
  }

  const payment_reference_id = decrypted_response.paymentReferenceId as string;
  const serviceFee = {
    serviceFee: "0.0",
    additionalCharge: "0.00",
  };

  const order_sensitive_data = {
    merchantId: process.env.NAGAD_MERCHANT_ID,
    orderId: order_id,
    currencyCode: "050",
    amount: data.amount,
    challenge: decrypted_response.challenge,
    otherAmount: serviceFee,
  };

  const header = await headers();

  // $host_name = $_SERVER['HTTP_HOST'];
  const host_name = header.get("host");

  const additional_merchant_info =
    data.service === "premium"
      ? {
          token: data.token,
          amount: data.amount,
          package: data.package,
          service: data.service,
          refer_code: data.refer_code,
          merchant_frontend_url: data.merchant_frontend_url,
        }
      : {
          token: data.token,
          amount: data.amount,
          service: data.service,
          merchant_frontend_url: data.merchant_frontend_url,
        };
  const callbackUrl = new URL(
    `${process.env.NODE_ENV === "production" ? "https://" : "http://"}${host_name}/nagad/callback/${encodeURIComponent(data.merchant_frontend_url)}`,
  );
  const order_post_data = {
    sensitiveData: encrypt_data_with_public_key(order_sensitive_data),
    signature: generate_signature(order_sensitive_data),
    merchantCallbackURL: callbackUrl.toString(),
    additionalMerchantInfo: additional_merchant_info,
  };

  //http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs/check-out/complete/{paymentReferenceId}

  try {
    response = await fetch(
      `${base_url}/check-out/complete/${payment_reference_id}`,
      {
        method: "POST",
        body: JSON.stringify(order_post_data),
        headers: {
          "Content-Type": "application/json",
          "X-KM-Api-Version": "v-0.2.0",
          "X-KM-IP-V4": await get_ip_address(),
          "X-KM-Client-Type": "PC_WEB",
        },
      },
    ).then((response) => response.json());
  } catch (e) {
    console.trace(e);
    throw new Error("nagad server error [get url]");
  }

  if (response.status !== "Success") {
    throw new Error("Invalid response[get url]");
  }
  return response.callBackUrl as string;
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

function get_date_time() {
  const tmpDate = new Date().toLocaleString("en", {
    timeZone: "Asia/Dhaka",
  });

  const date = new Date(tmpDate);

  return `${date.getFullYear().toString().padStart(4, "0")}${(date.getMonth() + 1).toString().padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}${date.getHours().toString().padStart(2, "0")}${date.getMinutes().toString().padStart(2, "0")}${date.getSeconds().toString().padStart(2, "0")}`;
}

function random_string() {
  const characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let random_string = "";

  for (let i = 0; i < characters.length; i++) {
    random_string += characters[getRandomNumber(0, characters.length - 1)];
  }

  return random_string;
}

function encrypt_data_with_public_key(sensitive_data: object) {
  const public_key = `-----BEGIN PUBLIC KEY-----
${process.env.NAGAD_PUBLIC_KEY}
-----END PUBLIC KEY-----`;
  const buffer = Buffer.from(JSON.stringify(sensitive_data), "utf8");
  const encrypted = crypto.publicEncrypt(
    {
      key: public_key,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer,
  );

  return encrypted.toString("base64");
}

function generate_signature(sensitive_data: object) {
  let data: string;
  if (typeof sensitive_data === "object") {
    data = JSON.stringify(sensitive_data);
  } else {
    data = sensitive_data;
  }

  const privateKey = `-----BEGIN RSA PRIVATE KEY-----
${process.env.NAGAD_MERCHANT_PRIVATE_KEY}
-----END RSA PRIVATE KEY-----`;

  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();

  const signature = sign.sign(privateKey, "base64");

  return signature;
}

async function get_ip_address(): Promise<string> {
  const headersList = await headers();
  const keys = [
    "x-client-ip",
    "x-forwarded-for",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
    "remote-addr",
  ];

  let ipAddress = "UNKNOWN";

  for (const key of keys) {
    const ip = headersList.get(key);
    if (ip) {
      ipAddress = ip.split(",")[0].trim(); // In case of multiple IPs
      break;
    }
  }

  return ipAddress;
}

function decrypt_data_with_private_key(data: string) {
  const privateKeyEnv = `${process.env.NAGAD_MERCHANT_PRIVATE_KEY}`;

  const privateKey = new NodeRSA();

  privateKey.importKey(privateKeyEnv, "pkcs8-private");

  privateKey.setOptions({ encryptionScheme: "pkcs1", environment: "browser" });
  return privateKey.decrypt(data).toString("utf8");
}
