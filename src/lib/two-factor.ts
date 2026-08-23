import {
  generateSecret,
  generateURI,
  verify,
} from "otplib";

export async function createTwoFactorSetup(email: string) {
  const secret = generateSecret();

  const uri = generateURI({
    issuer: "SIPDFS",
    label: email,
    secret,
  });

  return {
    secret,
    uri,
  };
}

export async function verifyTwoFactorCode(
  secret: string,
  token: string
) {
  const result = await verify({
    secret,
    token,
  });

  return result.valid;
}