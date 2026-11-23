import { spawn } from "node:child_process";
import { Networks, StrKey } from "@stellar/stellar-sdk";

export const TESTNET_RPC = "https://soroban-testnet.stellar.org/";

export function validIssuerAlias(alias) {
  return typeof alias === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(alias) &&
    !/^[SG][A-Z2-7]{55}$/i.test(alias);
}

function runStellar(args, input = "") {
  return new Promise((resolve, reject) => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(STELLAR_|SOROBAN_|GENOMAP_STELLAR_|HTTPS?_PROXY$|ALL_PROXY$)/i.test(key)));
    const child = spawn("stellar", ["--no-cache", ...args], {
      env, shell: false, windowsHide: true, stdio: ["pipe", "pipe", "ignore"],
    });
    let output = "";
    let stopReason;
    const timer = setTimeout(() => stop("Stellar CLI timed out."), 15_000);
    function stop(message) {
      stopReason = message;
      child.kill();
    }
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      if (stopReason) return;
      output += chunk;
      if (output.length > 256_000) stop("Stellar CLI returned an oversized response.");
    });
    child.stdin.on("error", () => {});
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("The Stellar CLI could not start."));
    });
    child.once("close", (status) => {
      clearTimeout(timer);
      if (status === 0 && !stopReason) resolve(output.trim());
      else reject(new Error(stopReason ?? "The Stellar CLI could not complete the alias operation."));
    });
    child.stdin.end(input === "" ? "" : input + "\n");
  });
}

export async function addressForAlias(alias) {
  if (!validIssuerAlias(alias)) throw new Error("Provide a Stellar CLI identity alias.");
  const address = await runStellar(["keys", "address", alias]);
  if (!StrKey.isValidEd25519PublicKey(address)) throw new Error("The alias did not resolve to a Stellar account.");
  return address;
}

export function signWithAlias(alias, unsignedXdr) {
  if (!validIssuerAlias(alias)) throw new Error("Provide a Stellar CLI identity alias.");
  return runStellar(["tx", "sign", "--sign-with-key", alias, "--rpc-url", TESTNET_RPC,
    "--network-passphrase", Networks.TESTNET], unsignedXdr);
}
