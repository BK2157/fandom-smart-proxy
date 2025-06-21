export default function Privacy() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Privacy Policy</h1>
      <p>This GPT uses a proxy API hosted on Vercel to query public fandom wiki content. No personal or sensitive information is collected, stored, or transmitted beyond the user’s prompt.</p>
      <p>All requests are ephemeral and processed server-side without logging user data.</p>
      <p>Contact: [your email or Discord/Reddit handle]</p>
    </div>
  );
}
