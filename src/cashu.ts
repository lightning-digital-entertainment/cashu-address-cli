import { finalizeEvent, nip98 } from "nostr-tools";
// @ts-ignore
import { decode } from "light-bolt11-decoder";

const URLS = {
  balance: "https://cashu-address.com/api/v1/balance",
  claim: "https://cashu-address.com/api/v1/claim",
  info: "https://cashu-address.com/api/v1/info",
};

export function parseInvoice(invoice: string) {
  const { sections } = decode(invoice);
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].name === "amount") {
      return sections[i].value / 1000;
    }
  }
}

export async function getInfo(sk: Uint8Array) {
  const authHeader = await nip98.getToken(URLS.info, "GET", (e) =>
    finalizeEvent(e, sk),
  );
  const res = await authedJsonRequest(URLS.info, authHeader);
  const data = await res.json();
  return data;
}

export async function getBalance(sk: Uint8Array) {
  const authHeader = await nip98.getToken(
    "https://cashu-address.com/api/v1/balance",
    "GET",
    (e) => finalizeEvent(e, sk),
  );
  const res = await authedJsonRequest(
    "https://cashu-address.com/api/v1/balance",
    authHeader,
  );
  const data = (await res.json()) as
    | { error: true; message: string }
    | { error: false; data: number };
  if (data.error) {
    throw new Error(data.message);
  }
  return data.data;
}

export async function getToken(sk: Uint8Array) {
  const authHeader = await nip98.getToken(URLS.claim, "GET", (e) =>
    finalizeEvent(e, sk),
  );
  const res = await authedJsonRequest(URLS.claim, authHeader);
  const data = (await res.json()) as
    | { error: true; message: string }
    | { error: false; data: { token: string } };
  if (data.error) {
    throw new Error(data.message);
  }
  return data.data;
}

export async function authedJsonRequest(
  url: string,
  authHeader: string,
  options?: RequestInit,
) {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
  });
}
