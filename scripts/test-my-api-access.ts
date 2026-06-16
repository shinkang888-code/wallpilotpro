/**
 * My API owner gate — run: npx tsx scripts/test-my-api-access.ts
 */
import {
  MY_API_PLATFORM_OWNER_EMAIL,
  canManagePlatformApis,
} from "../src/lib/my-api-access.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  assert(MY_API_PLATFORM_OWNER_EMAIL === "shinkang888@gmail.com", "owner email constant");
  assert(canManagePlatformApis("shinkang888@gmail.com"), "owner allowed");
  assert(canManagePlatformApis("Shinkang888@Gmail.com"), "owner case-insensitive");
  assert(!canManagePlatformApis("other@example.com"), "other user denied");
  assert(!canManagePlatformApis(null), "null denied");
  assert(!canManagePlatformApis(""), "empty denied");
  console.log("PASS: my-api access rules OK");
}

main();
