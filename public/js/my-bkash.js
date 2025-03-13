const url = new URL(window.location);

const btn = document.getElementById("bKash_button");
let paymentID;
const fe_url = url.searchParams.get("merchant_frontend_url");
const service = url.searchParams.get("service");
const token = url.searchParams.get("token");
const amount = url.searchParams.get("amount");
const package = url.searchParams.get("package") || "";
const refer_code = url.searchParams.get("refer_code") || "";
const bkash_create_body =
  service === "premium"
    ? {
        token,
        amount,
        package,
        refer_code,
        service,
      }
    : {
        token,
        amount,
        service,
      };
let bkash_execute_body =
  service === "premium"
    ? {
        paymentID: paymentID,
        token,
        amount,
        package,
        refer_code,
        service,
      }
    : {
        paymentID,
        token,
        amount,
        service,
      };
bKash.init({
  paymentMode: "checkout",
  paymentRequest: {
    amount, //max two decimal points allowed
    intent: "sale",
  },
  createRequest: () => {
    fetch("/bkash/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bkash_create_body),
    })
      .then((response) => response.json())
      .then((response) => {
        if (!!response?.success) {
          paymentID = response.response.paymentID;
          bkash_execute_body =
            service === "premium"
              ? {
                  paymentID,
                  token,
                  amount,
                  package,
                  refer_code,
                  service,
                }
              : {
                  paymentID,
                  token,
                  amount,
                  service,
                };
          bKash.create().onSuccess(response.response);
        } else {
          window.location.href = `${fe_url}?status=error&message=${encodeURI(response.message)}`;
        }
      })
      .catch(() => {
        window.location.href = `${fe_url}?status=error&message=${encodeURI("fetch error [main]")}`;
        bKash.create().onError();
      });
  },
  executeRequestOnAuthorization: () => {
    fetch("/bkash/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bkash_execute_body),
    })
      .then((response) => response.json())
      .then((response) => {
        if (response?.status === "success") {
          window.location.href = `${fe_url}?status=success&token=${response.token}`;
        } else {
          window.location.href = `${fe_url}?status=${encodeURI(response.status)}&message=${encodeURI(response.message)}`;
        }
      })
      .catch(() => {
        window.location.href = `${fe_url}?status=error&message=${encodeURI("fetch error")}`;
        bKash.execute().onError();
      });
  },
});
btn.removeAttribute("disabled");
