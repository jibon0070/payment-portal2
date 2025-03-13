"use client";

import Script from "next/script";
import { useCallback, useState } from "react";

export default function Client() {
  const [jQueryLoading, setjQueryLoading] = useState(true);
  const [bkashLoading, setBkashLoading] = useState(true);
  const [myBkashLoading, setMyBkashLoading] = useState(true);

  const loading = useCallback(
    (): boolean => jQueryLoading || bkashLoading || myBkashLoading,
    [bkashLoading, jQueryLoading, myBkashLoading],
  );

  return (
    <>
      {/* first load this */}
      <Script
        src="https://code.jquery.com/jquery-3.3.1.min.js"
        integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8="
        crossOrigin="anonymous"
        onLoad={() => setjQueryLoading(false)}
        strategy="afterInteractive"
      />
      {/* second load this */}
      <Script
        src="https://scripts.pay.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout.js"
        onLoad={() => setBkashLoading(false)}
        strategy="afterInteractive"
      />
      {/* third load this */}
      {!jQueryLoading && !bkashLoading && (
        <Script
          src={"/js/my-bkash.js"}
          onLoad={() => setMyBkashLoading(false)}
          strategy="afterInteractive"
        />
      )}
      <main className="h-screen flex items-center justify-center">
        <button id="bKash_button" disabled={loading()} className="btn">
          {loading() ? "Loading" : "Tap to pay with bkash"}
        </button>
      </main>
    </>
  );
}
