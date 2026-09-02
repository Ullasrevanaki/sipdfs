import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const APP_NAME = "Smart Inventory Demand Forecasting System";

export async function createTotpSetup(email: string) {
  const secret = generateSecret();

  const uri = generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });

  const qrCode = await QRCode.toDataURL(uri);

  return {
    secret,
    uri,
    qrCode,
  };
}

export async function verifyTotp(
  secret: string,
  token: string
): Promise<boolean> {
  const result = await verify({
    secret,
    token,
  });

  return result.valid;
}