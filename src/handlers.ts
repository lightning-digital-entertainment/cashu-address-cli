import prompts from "prompts";
import { getBalance, getToken, parseInvoice } from "./cashu";
import chalk from "chalk";
import {
  CashuMint,
  CashuWallet,
  getDecodedToken,
  getEncodedToken,
} from "@cashu/cashu-ts";
import { deleteConfig } from "./config";
import { keypress, waitForEnter, waitForKey } from "./utils";

const mainChoices = [
  {
    title: "Balance",
    description: "check your balance",
    value: "balance",
  },
  {
    title: "Claim eCash",
    description: "Claim SATS collected as Cashu token",
    value: "claim-cashu",
  },
  {
    title: "Claim on Lightning",
    description: "Claim SATS collected on Lightning",
    value: "claim-ln",
  },
  {
    title: "Settings",
    description: "Open the settings",
    value: "settings",
  },
  {
    title: "Exit",
    value: "exit",
  },
];

const mainChoicesUsername = [
  {
    title: "Balance",
    description: "check your balance",
    value: "balance",
  },
  {
    title: "Claim eCash",
    description: "Claim SATS collected as Cashu token",
    value: "claim-cashu",
  },
  {
    title: "Claim on Lightning",
    description: "Claim SATS collected on Lightning",
    value: "claim-ln",
  },
  {
    title: "Claim Username (5000 SATS)",
    description: "Claim your address alias (e.g. username@cashu-address.com)",
    value: "username",
  },
  {
    title: "Settings",
    description: "Open the settings",
    value: "settings",
  },
  {
    title: "Exit",
    value: "exit",
  },
];

export async function mainMenu(sk: Uint8Array) {
  console.clear();
  if (global.info) {
    console.log(
      `Welcome ${chalk.green(global.info.username || global.info.npub)} !`,
    );
    console.log("");
  }
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "Main Menu: What do you want to do?",
    choices: global.info?.username ? mainChoices : mainChoicesUsername,
  });
  if (action === "balance") {
    return balanceCallback(sk);
  }
  if (action === "settings") {
    return settingsCallback(sk);
  }

  if (action === "claim-cashu") {
    return claimCashuCallback(sk);
  }
  if (action === "claim-ln") {
    return claimLightningCallback(sk);
  }
  if (action === "exit") {
    return;
  }
  if (action === "username") {
    return usernameCallback(sk);
  }
}

async function usernameCallback(sk: Uint8Array) {
  console.log(
    chalk.red(
      "Sorry! Claiming a username is not yet supported by cashu-address-cli. Please go to https://cashu-address.com/username to claim one...",
    ),
  );
  await waitForEnter();
  return mainMenu(sk);
}

async function settingsCallback(sk: Uint8Array) {
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "Settings Menu -- What's next?",
    choices: [
      {
        title: "Delete data",
        description: "Deletes locally stored data",
        value: "delete",
      },
      {
        title: "Back",
        value: "back",
      },
    ],
  });

  if (action === "back") {
    return mainMenu(sk);
  }
  if (action === "delete") {
    return deleteCallback(sk);
  }
}

async function deleteCallback(sk: Uint8Array) {
  const { confirmation } = await prompts({
    type: "toggle",
    name: "confirmation",
    message: "Are you sure you want to delete local data?",
    initial: false,
    active: "yes",
    inactive: "no",
  });
  if (!confirmation) {
    return mainMenu(sk);
  }
  console.log("Deleting data...");
  try {
    await deleteConfig();
    console.log(
      chalk.green("Config file successfully deleted... See you next time!"),
    );
  } catch (e) {
    console.log(chalk.red("Encounted an issue deleting the config file..."));
    console.log(chalk.red(e));
  }
}

export async function claimCashuCallback(sk: Uint8Array) {
  try {
    const token = await getToken(sk);
    console.log("Here is your Cashu token:");
    console.log(chalk.bgWhite.black(token.token));
  } catch (e) {
    console.log(chalk.red(e.message));
  } finally {
    await waitForEnter();
    return mainMenu(sk);
  }
}

export async function claimLightningCallback(sk: Uint8Array) {
  try {
    const token = await getToken(sk);
    const decodedToken = getDecodedToken(token.token);
    const proofs = decodedToken.token.map((entry) => entry.proofs).flat();
    const amount = proofs.reduce((a, c) => a + c.amount, 0);
    const networkFees = Math.max(Math.floor((amount / 100) * 2), 3);
    let invoice: string | undefined;
    while (!invoice) {
      const { input } = await prompts(
        {
          type: "text",
          name: "input",
          message: `Please enter a Lightning invoice over ${
            amount - networkFees
          } to pay out to (enter "exit" to cancel)`,
        },
        {
          onCancel: () => {
            // HACK: while loop doesn't let users cancel... This needs to be implemented recursively
            process.exit(1);
          },
        },
      );
      try {
        const invoiceAmount = parseInvoice(input);
        if (invoiceAmount !== amount - networkFees) {
          throw new Error("");
        }
        invoice = input;
      } catch {
        console.log(
          chalk.red(
            `Invalid Invoice! Make sure the invoice has a value of ${
              amount - networkFees
            } SATS`,
          ),
        );
        continue;
      }
    }
    const mintUrl = decodedToken.token[0].mint;
    const wallet = new CashuWallet(new CashuMint(mintUrl));
    try {
      const { isPaid, change } = await wallet.payLnInvoice(invoice, proofs);
      const changeAmount = change.reduce((a, c) => a + c.amount, 0);
      if (isPaid) {
        console.log(chalk.black.bgGreenBright("Payment successfull"));
        console.log(
          chalk.black.bgRedBright(
            `There were ${changeAmount} SATS left from the fee reserve... You need to claim those using a Cashu wallet`,
          ),
        );
        console.log(
          chalk.bgWhite.black(
            getEncodedToken({
              memo: "",
              token: [{ mint: mintUrl, proofs: change }],
            }),
          ),
        );
      }
    } catch (e) {
      console.log(chalk.red(e.message));
    }
  } catch (e) {
    console.log(chalk.red(e.message));
  } finally {
    await waitForEnter();
    return mainMenu(sk);
  }
}

export async function balanceCallback(sk: Uint8Array) {
  const balance = await getBalance(sk);
  console.log(
    `Your balance is: ${chalk.green(balance)} ${chalk.green("SATS")}`,
  );
  await waitForEnter();
  return mainMenu(sk);
}
