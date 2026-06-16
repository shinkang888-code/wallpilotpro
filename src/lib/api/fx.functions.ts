import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchUsdKrwRate } from "@/lib/fx/usd-krw.server";

export const getUsdKrwRate = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    const rate = await fetchUsdKrwRate();
    return { rate, asOf: new Date().toISOString() };
  });
