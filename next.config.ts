import type { NextConfig } from "next";

// Single-user app in Nigeria (WAT, UTC+1, no DST). Vercel servers run in UTC, so
// without this every date the server parses/formats/pushes would be an hour off.
// Pinning the process timezone makes datetime-local parsing, the calendar grids,
// display, and the Google Calendar push all agree on WAT. Override with a TZ env
// var if you ever move.
process.env.TZ = process.env.TZ || "Africa/Lagos";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
