import { action, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { BrowserUse } from "browser-use-convex-component";

const browserUse = new BrowserUse(components.browserUse);

// ------- Tasks -------

export const createTask = action({
  args: {
    task: v.string(),
    sessionId: v.optional(v.string()),
    startUrl: v.optional(v.string()),
    llm: v.optional(v.string()),
    maxSteps: v.optional(v.number()),
    flashMode: v.optional(v.boolean()),
    thinking: v.optional(v.boolean()),
    vision: v.optional(v.union(v.boolean(), v.literal("auto"))),
    highlightElements: v.optional(v.boolean()),
    systemPromptExtension: v.optional(v.string()),
    secrets: v.optional(v.any()),
    allowedDomains: v.optional(v.array(v.string())),
    structuredOutput: v.optional(v.any()),
    metadata: v.optional(v.any()),
    judge: v.optional(v.boolean()),
    judgeGroundTruth: v.optional(v.string()),
    judgeLlm: v.optional(v.string()),
    skillIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await browserUse.createTask(ctx, args);
  },
});

export const getTask = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getTask(ctx, { taskId: args.taskId });
  },
});

export const listTasks = query({
  args: {
    sessionId: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("created"),
        v.literal("started"),
        v.literal("paused"),
        v.literal("finished"),
        v.literal("stopped"),
        v.literal("failed"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await browserUse.listTasks(ctx, args);
  },
});

export const getTaskSteps = query({
  args: { taskId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getTaskSteps(ctx, { taskId: args.taskId });
  },
});

export const fetchTaskStatus = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchTaskStatus(ctx, args);
  },
});

export const fetchTaskDetail = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchTaskDetail(ctx, args);
  },
});

export const stopTask = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.stopTask(ctx, args);
  },
});

// ------- Sessions -------

export const createSession = action({
  args: {
    profileId: v.optional(v.string()),
    proxyCountryCode: v.optional(v.string()),
    startUrl: v.optional(v.string()),
    browserScreenWidth: v.optional(v.number()),
    browserScreenHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await browserUse.createSession(ctx, args);
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getSession(ctx, { sessionId: args.sessionId });
  },
});

export const listSessions = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("stopped"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await browserUse.listSessions(ctx, args);
  },
});

export const fetchSessionDetail = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.fetchSessionDetail(ctx, args);
  },
});

export const stopSession = action({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.stopSession(ctx, args);
  },
});

// ------- Profiles -------

export const createProfile = action({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return await browserUse.createProfile(ctx, args);
  },
});

export const listProfiles = action({
  args: {},
  handler: async (ctx) => {
    return await browserUse.listProfiles(ctx);
  },
});

export const getProfile = action({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.getProfile(ctx, args);
  },
});

export const updateProfile = action({
  args: { profileId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.updateProfile(ctx, args);
  },
});

export const deleteProfile = action({
  args: { profileId: v.string() },
  handler: async (ctx, args) => {
    return await browserUse.deleteProfile(ctx, args);
  },
});
