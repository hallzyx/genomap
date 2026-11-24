import { isConnected, requestAccess, signMessage } from "@stellar/freighter-api";

const toBase64 = (value) => {
  if (typeof value === "string") return value;
  let binary = "";
  for (const byte of new Uint8Array(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Ask Freighter for the public address. Never touches a secret key. */
export async function connectWallet() {
  const status = await isConnected();
  if (!status?.isConnected) throw Object.assign(new Error("missing"), { code: "freighter_missing" });
  const access = await requestAccess();
  if (access?.error || !access?.address) throw Object.assign(new Error("rejected"), { code: "freighter_rejected" });
  return access.address;
}

/** Sign a plain-text message (SEP-53). It is free and moves no money. */
export async function signProof(message, address) {
  const result = await signMessage(message, { address });
  if (result?.error || !result?.signedMessage) {
    throw Object.assign(new Error("rejected"), { code: "freighter_rejected" });
  }
  return toBase64(result.signedMessage);
}
