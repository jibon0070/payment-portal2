"use server";

import jwt from "jsonwebtoken";

export default async function getServerToken() {
  const payload = {
    subject: "payment portal",
  };

  return jwt.sign(payload, process.env.JWT_SECRET!);
}
