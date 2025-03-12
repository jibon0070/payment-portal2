import jwt from "jsonwebtoken";

export default function getServerToken() {
  const payload = {
    subject: "payment portal",
  };

  return jwt.sign(payload, process.env.JWT_SECRET!);
}
