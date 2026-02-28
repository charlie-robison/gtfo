/**
 * OpenAI GPT-4o utilities for structured data extraction.
 *
 * Used to parse free-text browser agent output into structured
 * data, and for house photo analysis via GPT-4o vision.
 */

import OpenAI from "openai";
import {
  REDFIN_PARSE_SYSTEM_PROMPT,
  UHAUL_PARSE_SYSTEM_PROMPT,
} from "./prompts.js";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function stripMarkdownFences(text: string): string {
  if (text.startsWith("```")) {
    const lines = text.split("\n");
    return lines.filter((l) => !l.trim().startsWith("```")).join("\n");
  }
  return text;
}

// ── Redfin result parsing ───────────────────────────────────────

export interface RedfinListing {
  address: string;
  monthlyRentPrice: number;
  numBedrooms: number;
  numBathrooms: number;
  squareFootage: number;
  moveInCost: number;
  url: string;
}

export async function parseRedfinResults(
  agentResult: string
): Promise<RedfinListing[]> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [
      { role: "system", content: REDFIN_PARSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the rental listings from this agent output:\n\n${agentResult}`,
      },
    ],
  });

  const raw = stripMarkdownFences(
    response.choices[0].message.content?.trim() ?? "[]"
  );
  return JSON.parse(raw);
}

// ── U-Haul result parsing ───────────────────────────────────────

export interface UhaulResult {
  vehicle: string;
  pickupLocation: string;
  pickupTime: string;
  dropOffLocation: string;
  movingHelpProvider: string;
  numWorkers: number;
  numHours: number;
  totalCost: number;
}

export async function parseUhaulResult(
  agentResult: string
): Promise<UhaulResult> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: UHAUL_PARSE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the U-Haul reservation details from this agent output:\n\n${agentResult}`,
      },
    ],
  });

  const raw = stripMarkdownFences(
    response.choices[0].message.content?.trim() ?? "{}"
  );
  return JSON.parse(raw);
}

// ── House photo analysis ────────────────────────────────────────

export interface HouseAnalysisResult {
  house_description: string;
  estimated_bedrooms: number;
  estimated_square_footage: number;
  stuff_volume_estimate: string;
  recommended_truck_size: string;
  reasoning: string;
  recommended_workers: number;
  labor_reasoning: string;
}

export async function analyzeHousePhoto(
  imageBase64DataUrl: string,
  prompt: string
): Promise<HouseAnalysisResult> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64DataUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = stripMarkdownFences(
    response.choices[0].message.content?.trim() ?? "{}"
  );
  return JSON.parse(raw);
}

// ── Furniture recommendations ───────────────────────────────────

export interface FurnitureItemResult {
  item_name: string;
  room: string;
  amazon_search_query: string;
  priority: string;
}

interface FurnitureResponse {
  reasoning: string;
  items: FurnitureItemResult[];
}

export async function recommendFurniture(
  imageBase64DataUrl: string,
  prompt: string
): Promise<FurnitureResponse> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64DataUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = stripMarkdownFences(
    response.choices[0].message.content?.trim() ?? '{"reasoning":"","items":[]}'
  );
  return JSON.parse(raw);
}
