/**
 * WallPilot Pro — intellectual property ownership (public-safe constants).
 * Full legal text: LEGAL/PROPRIETARY_NOTICE.md
 */

export const IP_OWNER = {
  legalName: "Terrabridge Capital Inc.",
  domain: "terrabridgecapital.inc",
  contactEmail: "terrabridgecapital@gmail.com",
} as const;

export const IP_INVENTOR = {
  email: "kangjunchul8@gmail.com",
  role: "Inventor & Lead Developer",
} as const;

export const IP_PRODUCT = {
  name: "WallPilot Pro",
  shortName: "WallPilot",
  mark: "WallPilot™",
} as const;

export const IP_COPYRIGHT_LINE = `© ${new Date().getFullYear()} ${IP_OWNER.legalName}. All rights reserved.`;

export const IP_WARNING_SHORT =
  "Proprietary software. Unauthorized copying, cloning, or reverse engineering is prohibited.";

export type IpOwnershipPublic = {
  owner: typeof IP_OWNER;
  inventor: typeof IP_INVENTOR;
  product: typeof IP_PRODUCT;
  copyright: string;
  notice: string;
  buildId: string;
};

export function publicIpManifest(buildId: string): IpOwnershipPublic {
  return {
    owner: IP_OWNER,
    inventor: IP_INVENTOR,
    product: IP_PRODUCT,
    copyright: IP_COPYRIGHT_LINE,
    notice: IP_WARNING_SHORT,
    buildId,
  };
}
