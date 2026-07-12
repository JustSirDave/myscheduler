// Runs once when the server process starts, before any request is handled.
// Pin the process timezone to WAT (Nigeria, UTC+1, no DST). Vercel servers run in
// UTC otherwise, which shifts every parsed/formatted/pushed time by an hour. Node
// re-reads process.env.TZ on the next Date operation, so setting it here takes
// effect for all server components, actions, and the Google Calendar push.
export async function register() {
  process.env.TZ = process.env.TZ || "Africa/Lagos";
}
