/**
 * Browser Use component client.
 *
 * Wraps the browser-use-convex-component for use throughout
 * the Convex backend.
 */

import { BrowserUse } from "browser-use-convex-component";
import { components } from "./_generated/api.js";

export const browserUse = new BrowserUse(components.browserUse);
