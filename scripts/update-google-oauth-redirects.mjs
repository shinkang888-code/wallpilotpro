/**
 * Print required Google Cloud OAuth redirect URIs for WallPilot Pro.
 * Add these manually in Google Cloud Console → Credentials → OAuth 2.0 Client.
 */
const PROJECT_REF = "dhqmswuslspaeabaxpxc";
const SITE_URL = "https://wallpilotpro.vercel.app";

const required = [
  `https://${PROJECT_REF}.supabase.co/auth/v1/callback`,
  `${SITE_URL}/auth/callback`,
  "http://localhost:8080/auth/callback",
  "http://127.0.0.1:8080/auth/callback",
];

console.log("Google Cloud Console → APIs & Services → Credentials");
console.log("OAuth client: 449994213653-...apps.googleusercontent.com\n");
console.log("Add these Authorized redirect URIs:\n");
for (const uri of required) {
  console.log(`  ${uri}`);
}
