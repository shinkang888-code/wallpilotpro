const keys = [
  "WALLPILOT_AGENT_SERVICE_URL",
  "WALLPILOT_RL_SERVICE_URL",
  "WALLPILOT_SIGNAL_SERVICE_URL",
  "WALLPILOT_CRYPTO_API_URL",
];

for (const key of keys) {
  const len = (process.env[key] ?? "").length;
  console.log(`${key}_LEN=${len}`);
}
