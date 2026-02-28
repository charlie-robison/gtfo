/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as browserUse from "../browserUse.js";
import type * as data from "../data.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as lib_openai from "../lib/openai.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as movingPipeline from "../movingPipeline.js";
import type * as orderFurniture from "../orderFurniture.js";
import type * as searchRentals from "../searchRentals.js";
import type * as updateAddress from "../updateAddress.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  browserUse: typeof browserUse;
  data: typeof data;
  http: typeof http;
  jobs: typeof jobs;
  "lib/openai": typeof lib_openai;
  "lib/prompts": typeof lib_prompts;
  movingPipeline: typeof movingPipeline;
  orderFurniture: typeof orderFurniture;
  searchRentals: typeof searchRentals;
  updateAddress: typeof updateAddress;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  browserUse: {
    profiles: {
      create: FunctionReference<
        "action",
        "internal",
        { apiKey: string; name?: string },
        { createdAt: string; id: string; name?: string }
      >;
      deleteProfile: FunctionReference<
        "action",
        "internal",
        { apiKey: string; profileId: string },
        null
      >;
      getProfile: FunctionReference<
        "action",
        "internal",
        { apiKey: string; profileId: string },
        {
          cookieDomains: Array<string>;
          createdAt: string;
          id: string;
          lastUsedAt?: string;
          name?: string;
        }
      >;
      list: FunctionReference<
        "action",
        "internal",
        { apiKey: string },
        Array<{
          cookieDomains: Array<string>;
          createdAt: string;
          id: string;
          lastUsedAt?: string;
          name?: string;
        }>
      >;
      update: FunctionReference<
        "action",
        "internal",
        { apiKey: string; name: string; profileId: string },
        { id: string; name?: string }
      >;
    };
    sessions: {
      create: FunctionReference<
        "action",
        "internal",
        {
          apiKey: string;
          browserScreenHeight?: number;
          browserScreenWidth?: number;
          profileId?: string;
          proxyCountryCode?: string;
          startUrl?: string;
        },
        { externalId: string; liveUrl?: string; sessionId: string }
      >;
      fetchDetail: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        any
      >;
      get: FunctionReference<"query", "internal", { sessionId: string }, any>;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: "active" | "stopped" },
        any
      >;
      stop: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        null
      >;
    };
    tasks: {
      create: FunctionReference<
        "action",
        "internal",
        {
          allowedDomains?: Array<string>;
          apiKey: string;
          flashMode?: boolean;
          highlightElements?: boolean;
          judge?: boolean;
          judgeGroundTruth?: string;
          judgeLlm?: string;
          llm?: string;
          maxSteps?: number;
          metadata?: any;
          secrets?: any;
          sessionId?: string;
          skillIds?: Array<string>;
          startUrl?: string;
          structuredOutput?: any;
          systemPromptExtension?: string;
          task: string;
          thinking?: boolean;
          vision?: boolean | "auto";
        },
        { externalId: string; sessionId: string; taskId: string }
      >;
      fetchDetail: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        any
      >;
      fetchStatus: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        { isSuccess?: boolean; output?: string; status: string }
      >;
      get: FunctionReference<"query", "internal", { taskId: string }, any>;
      getSteps: FunctionReference<"query", "internal", { taskId: string }, any>;
      list: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          sessionId?: string;
          status?:
            | "created"
            | "started"
            | "paused"
            | "finished"
            | "stopped"
            | "failed";
        },
        any
      >;
      stop: FunctionReference<
        "action",
        "internal",
        { apiKey: string; externalId: string },
        null
      >;
    };
  };
};
