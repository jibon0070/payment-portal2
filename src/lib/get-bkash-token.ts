export default async function getBkashToken() {
  const response = await fetch(
    `${process.env.BKASH_BASE_URL}/checkout/token/grant`,
    {
      method: "POST",
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        password: process.env.BKASH_PASSWORD!,
        username: process.env.BKASH_USERNAME!,
      },
    },
  ).then((r) => r.json());

  return response.id_token;
}
