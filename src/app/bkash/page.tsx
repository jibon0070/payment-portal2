import { Metadata } from "next";
import Client from "./_components/client";

export const metadata: Metadata = {
  title: "Bkash Payment Portal",
  icons: "/bkash-logo.png",
};

export default function Bkash() {
  return <Client />;
}
