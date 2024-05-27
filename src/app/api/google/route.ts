import { google } from "googleapis";

export default function handler(req: any, res: any) {
  // Fetch Calendar Service Instance
  if (req.method === "GET") {
    res.status(200).json({
      googleApiInstance: google.calendar({
        version: "v3",
        auth: process.env.NEXT_PUBLIC_G_API_KEY,
      }),
    });
  }
}
