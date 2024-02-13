import { nip19 } from "nostr-tools";

export function parseKey(key: `nsec1${string}` | string) {
  if (key.startsWith("nsec1")) {
    return nip19.decode(key as `nsec1${string}`).data;
  }
  throw new Error("Invalid private key. Please provide key as nsec");
}
