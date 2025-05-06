import * as globals from "@/index";
import { logger } from "@/globals/logger";

Object.assign(globalThis, {
  ...globals,
  logger,
});

declare global {
  const $: typeof globals.$;
  const logger: typeof import("@/globals/logger").logger;
}
