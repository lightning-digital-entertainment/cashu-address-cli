import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import prompts from "prompts";
import { encryptKey } from "./encryption";
import { parseKey } from "./keys";
import { resolve } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

const userDir = homedir();
const configDir = resolve(userDir, ".cacli/");
const configPath = resolve(userDir, ".cacli/config.json");

export async function getConfig() {
  try {
    const config = await readFile(configPath, "utf8");
    return JSON.parse(config) as { user: string };
  } catch {
    return undefined;
  }
}

export async function deleteConfig() {
  return unlink(configPath);
}

export async function writeConfig(config: { user: string }) {
  const exists = existsSync(configDir);
  if (!exists) {
    await mkdir(configDir);
  }
  await writeFile(configPath, JSON.stringify(config), { flag: "w+" });
}

async function createPassphrase() {
  const { passphrase } = await prompts({
    type: "password",
    name: "passphrase",
    message: "Now choose the passphrase to encrypt your key with",
  });

  const { passphrase2 } = await prompts({
    type: "password",
    name: "passphrase2",
    message: "Now choose the passphrase to encrypt your key with",
  });
  if (passphrase !== passphrase2) {
    throw new Error("Entered passphrases are not equal");
  }
  return passphrase;
}

export async function createConfig() {
  const { nsec } = await prompts({
    type: "password",
    name: "nsec",
    message:
      "Enter your private key. I will be encrypted with a passphrase of your choice and then stored in your config",
  });
  try {
    parseKey(nsec);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
  let passphrase: string | undefined = undefined;
  while (!passphrase) {
    try {
      passphrase = await createPassphrase();
    } catch (e) {
      console.log(e);
    }
  }
  const encryptedKey = encryptKey(passphrase, nsec);
  await writeConfig({ user: encryptedKey });
  return { user: encryptedKey };
}
