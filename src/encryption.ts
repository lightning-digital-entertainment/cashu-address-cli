import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

export function decryptKey(encryptedKey: string, passphrase: string) {
  const [iv, encrypted] = encryptedKey.split(":");
  const key = Buffer.from(
    createHash("sha256").update(passphrase).digest("hex"),
    "hex",
  );

  const decipher = createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));

  decipher.write(Buffer.from(encrypted, "hex"));
  decipher.end();

  return decipher.read().toString("utf8");
}

export function encryptKey(passphrase: string, nsec: string) {
  const iv = randomBytes(16);
  const key = Buffer.from(
    createHash("sha256").update(passphrase).digest("hex"),
    "hex",
  );
  const cipher = createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(nsec);

  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
