import { Metadata } from "next";
import Client from "./_components/client";
import { z } from "zod";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Bkash Payment Portal",
  icons: "/bkash-logo.png",
};

export default async function Bkash(props: { searchParams: Promise<unknown> }) {
  try {
    z.object({
      merchant_frontend_url: z.string().min(1),
    }).parse(await props.searchParams);
  } catch {
    notFound();
  }

  return <Client />;
}
