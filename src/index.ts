import prompts from "prompts";
import { createConfig, getConfig } from "./config";
import { decryptKey } from "./encryption";
import { parseKey } from "./keys";
import { mainMenu } from "./handlers";
import { getInfo } from "./cashu";

async function main() {
  let config = await getConfig();
  if (!config) {
    console.log("No config found... Creating one");
    config = await createConfig();
  } else {
    console.log("Config file found... reading");
  }
  console.log("Passphrase required...");
  const { passphrase } = await prompts({
    type: "password",
    name: "passphrase",
    message: "Please enter your passphrase...",
  });
  const key = decryptKey(config.user, passphrase);
  const sk = parseKey(key);
  const info = await getInfo(sk);
  global.info = info;
  await mainMenu(sk);
}
main();
