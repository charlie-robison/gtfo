/**
 * Prompt templates for browser-use tasks and GPT-4o analysis.
 *
 * All prompts are preserved from the original Python skills with
 * identical agent instructions and human-like pacing directives.
 */

export const VALID_TRUCK_SIZES = [
  "8' Pickup Truck",
  "9' Cargo Van",
  "10' Truck",
  "12' Truck",
  "15' Truck",
  "17' Truck",
  "20' Truck",
  "26' Truck",
];

// ── Redfin Rental Search ────────────────────────────────────────

export function buildRedfinSearchTask(args: {
  city: string;
  state: string;
  maxRent: number;
  fullName: string;
  phone: string;
  moveInDate: string;
  message?: string;
  maxMoveInCost?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  maxResults?: number;
}): string {
  const {
    city,
    state,
    maxRent,
    fullName,
    phone,
    moveInDate,
    maxMoveInCost = 0,
    minBedrooms = 1,
    minBathrooms = 1,
    maxResults = 10,
  } = args;

  const message =
    args.message ||
    `Hello, my name is ${fullName}. I am interested in renting ` +
      `this property and would love to schedule a viewing. ` +
      `My desired move-in date is ${moveInDate}. ` +
      `Please let me know if the unit is still available. Thank you!`;

  const moveInFilter =
    maxMoveInCost > 0
      ? `
STEP 4 — Filter by move-in cost:
1. For each listing you collected, check if the listing mentions a security deposit or move-in cost.
2. Estimate the total move-in cost as: first month's rent + security deposit (if listed).
   - If no deposit info is shown, assume the deposit equals one month's rent.
3. Exclude any listing where the estimated move-in cost exceeds $${maxMoveInCost.toLocaleString()}.
`
      : "";

  return `
Go to https://www.redfin.com and do the following:

IMPORTANT — Human-like pacing (applies throughout the ENTIRE session):
Redfin does not use heavy CAPTCHAs, but you must still behave like a real
human to avoid triggering rate-limits or bot detection:
  - Wait 5–15 seconds between major navigation actions (searching, opening
    a listing, clicking "Contact").
  - Wait 2–3 seconds between filling individual form fields.
  - Scroll naturally — do not jump straight to elements. Scroll down the
    page in small increments, pausing briefly as you go.
  - If you see any CAPTCHA or "are you a robot?" challenge, wait 10 seconds
    and then attempt to solve it normally.

SESSION WARMING (do this FIRST):
1. Navigate to https://www.redfin.com and wait 5 seconds for the page to
   fully load. Do NOT immediately interact with the search bar.
2. Scroll down slowly about 30% of the page, then scroll back up. Wait 3
   seconds.
3. Once the Redfin homepage is visible, proceed.

STEP 1 — Navigate to rentals & search:
1. Look for a "Rent" tab/link near the top of the page and click it to
   switch to the rental search mode. This may take you to redfin.com/rentals
   or similar.
2. Find the search bar.
3. Type "${city}, ${state}" into the search bar.
4. Wait 2–3 seconds for the autocomplete suggestions to appear.
5. Select the correct city/state suggestion from the dropdown (click it).
6. Wait for the rental search results to load (5–10 seconds).

STEP 2 — Apply filters:
1. Set the maximum rent (price) filter to $${maxRent.toLocaleString()}/mo.
   - Look for a "Price" or "Rent" filter button, click it, and set the max
     price to ${maxRent}. Click "Apply" or close the dropdown to confirm.
2. Set bedrooms to ${minBedrooms}+ bedrooms.
   - Look for a "Beds" or "Bedrooms" filter and set the minimum to
     ${minBedrooms}.
3. Set bathrooms to ${minBathrooms}+ bathrooms.
   - Look for a "Baths" or "Bathrooms" filter and set the minimum to
     ${minBathrooms}.
4. Wait 5 seconds for the filtered results to update.

STEP 3 — Collect listings:
1. Browse the search results list.
2. For up to ${maxResults} listings, collect the following information for each:
   - Full address
   - Monthly rent price
   - Number of bedrooms and bathrooms
   - Square footage (if shown)
   - Security deposit or move-in cost (if shown)
   - The Redfin listing URL (the link to the individual listing page)
3. If the first page does not have enough results, go to page 2 if available.
${moveInFilter}
STEP 5 — Fill contact form for EACH listing (DEMO — DO NOT SUBMIT):
For each listing you collected above, do the following:

  5a. Navigate to the listing URL.
  5b. Wait 5–10 seconds for the page to fully load. Scroll down slowly to
      view the listing details.
  5c. Look for a button or link that says "Send Message", "Contact Property",
      "Request a Tour", "Email", "Contact Agent", or similar.
  5d. Click the most relevant contact button.
  5e. If a form or modal appears, fill in the fields with human-like pacing
      (2–3 seconds between each field):
      - Name / First Name / Last Name: ${fullName}
      - Email: use x_redfin_email
      - Phone: ${phone}
      - Move-in date: ${moveInDate}
      - Message: ${message}
      - Fill in any other required fields with reasonable information.
  5f. *** STOP HERE — DO NOT click the final submit / send button. ***
      This is a DEMO. Confirm the form is filled correctly and note that
      the form was filled but NOT submitted.
  5g. Wait 5 seconds, then move on to the next listing.

STEP 6 — Final report:
After processing all listings, summarize:
   - For each listing: address, rent, bedrooms/bathrooms, square footage,
     estimated move-in cost, listing URL, and contact status
     (form filled — not submitted, no contact button found, etc.).
   - Total number of listings found and total forms filled.
   - Any listings that could not be processed and why.
`;
}

// ── U-Haul Order ────────────────────────────────────────────────

export function buildUhaulOrderTask(args: {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime?: string;
  vehicleType?: string;
  numWorkers?: number;
  loadingAddress?: string;
}): string {
  const {
    pickupLocation,
    dropoffLocation,
    pickupDate,
    pickupTime = "10:00 AM",
    vehicleType = "truck",
    numWorkers = 0,
    loadingAddress = "",
  } = args;

  const serviceAddress = loadingAddress || pickupLocation;

  let step4: string;
  let step6Labor: string;

  if (numWorkers > 0) {
    step4 =
      `1. During the reservation flow, look for a "Moving Help" or "Moving Labor" section/page.\n` +
      `   This typically appears as an add-on step where you can hire moving helpers.\n` +
      `2. If the page asks for a loading/service address:\n` +
      `   a. Clear any pre-filled value in the address field.\n` +
      `   b. Type the full address: ${serviceAddress}\n` +
      `   c. Wait a moment for the autocomplete/suggestion dropdown to appear.\n` +
      `   d. Select the matching address from the dropdown list. You MUST click one of the dropdown suggestions — do not just press Enter on the typed text.\n` +
      `   e. If no dropdown appears, try re-typing the address more slowly or try a slightly different format.\n` +
      `   f. Click "Search", "Find Help", or the equivalent button after the address is accepted.\n` +
      `3. You should see a list of Moving Help service providers with prices, ratings, number of helpers, and hours.\n` +
      `4. Look for a provider offering ${numWorkers} helpers (workers/movers).\n` +
      `   - If no provider offers exactly ${numWorkers}, pick the closest match with at least ${numWorkers} workers.\n` +
      `5. Among matching providers, select the one with the lowest price.\n` +
      `6. Click "Select" or the equivalent button to add that Moving Help provider to the order.\n` +
      `7. Continue to the next step.`;
    step6Labor =
      "\n   - Moving Help provider selected, number of workers, hours, and cost";
  } else {
    step4 =
      '1. If a Moving Help or Moving Labor add-on page appears, skip it — click Continue or Next to proceed without adding labor.';
    step6Labor = "";
  }

  return `
Go to https://www.uhaul.com and do the following:

IMPORTANT — Human-like pacing (applies throughout the ENTIRE session):
U-Haul has aggressive bot detection and image-grid CAPTCHAs. You MUST behave
like a real human to minimize CAPTCHA triggers:
  - Wait 5–15 seconds between major navigation actions (page loads, clicking buttons).
  - Wait 2–3 seconds between filling individual form fields.
  - Scroll naturally — do not jump straight to elements. Scroll down in small
    increments, pausing briefly as you go.
  - Move the mouse to elements before clicking. Do not teleport the cursor.
  - Never rush through forms — a real person takes time reading the page.

SESSION WARMING (do this FIRST — this is critical for avoiding bot detection):
1. Navigate to https://www.uhaul.com and wait 8 seconds for the page to fully load.
   Do NOT immediately click anything or interact with ANY element.
2. Move the mouse slowly from the center of the page toward the top navigation area.
   Pause for 2 seconds.
3. Scroll down slowly about 40% of the page in small increments (not one big scroll).
   Pause 3 seconds while "reading" the page content.
4. Scroll back up slowly. Pause 2 seconds.
5. Move the mouse around the header area naturally for 2 seconds, then proceed to Step 1.

STEP 1 — Sign in:
1. Look for a "Sign In" link or button (usually in the top-right header area).
   Move the mouse to it naturally, pause 1 second, then click it.
2. Wait 3–5 seconds after the sign-in page/modal fully loads.
   Scroll down slightly and back up to appear human. Wait 2 more seconds.
3. Click directly on the email/username input field. Wait 1 second.
   Type x_uhaul_email SLOWLY — one character at a time with a brief pause
   (~100-200ms) between each keystroke, like a human typing. Do NOT paste.
4. Press TAB or click directly on the password input field. Wait 1 second.
   Type x_uhaul_pass SLOWLY — same character-by-character pace as above.
5. If there is a "Remember me" or "Keep me signed in" checkbox, check it.
6. Wait 1–2 seconds, then click the Sign In / Log In button.
7. Wait 5–10 seconds for the page to respond.

CAPTCHA HANDLING — CAPTCHAs may appear at any point (login, reservation, etc.).
Handle them using these instructions:

  ** reCAPTCHA v2 Checkbox ("I'm not a robot") **
  a. If you see a checkbox labeled "I'm not a robot" (reCAPTCHA), move the
     mouse toward it in a slightly curved, natural path (not a straight line).
  b. Pause for 0.5–1 second near the checkbox, then click it.
  c. Wait 3–5 seconds. The checkbox may turn green with a checkmark (passed)
     or an image-grid challenge may appear. Proceed accordingly.

  ** Image-Grid CAPTCHA (e.g. "Select all images with [object]") **
  a. READ the prompt carefully — note the EXACT object requested (crosswalks,
     traffic lights, buses, bicycles, fire hydrants, stairs, chimneys, bridges,
     motorcycles, boats, palm trees, taxis, mountains, etc.).
  b. The grid is typically 3x3 or 4x4 tiles. Examine EACH tile individually
     using your vision. Take your time — accuracy matters more than speed.
  c. For each tile, ask yourself: "Does this tile contain the requested object,
     even partially?" Objects at tile edges or partially obscured still count.
  d. Click on ALL matching tiles. Wait 0.5 seconds between each click.
  e. After selecting tiles, wait 2–3 seconds. Some CAPTCHAs replace clicked
     tiles with new images that fade in.
  f. If new tiles appear after your selection, carefully evaluate the NEW tiles
     too. Click any that match. Wait again for potential replacements.
  g. Repeat step (f) until no new tiles appear after your last selection.
  h. Once all matching tiles are selected and stable, click "Verify" or "Next".
  i. If the CAPTCHA rejects your answer and shows a new challenge, do NOT rush.
     Wait 2 seconds, then carefully solve the new challenge from scratch.
  j. If you fail 3 times, wait 30 seconds before trying again. After 5 total
     failures, try clicking the audio CAPTCHA icon (headphones) as a fallback.

  ** Audio CAPTCHA **
  a. If an audio option is available (headphones icon), click it.
  b. Listen to the audio clip and type what you hear into the text field.
  c. Click "Verify".

  ** Cloudflare Turnstile / "Verify you are human" **
  a. If you see a Cloudflare verification widget ("Verify you are human" with
     a spinning indicator), wait 5–10 seconds. It often resolves automatically.
  b. If a checkbox appears, click it like the reCAPTCHA checkbox above.
  c. If it continues spinning beyond 15 seconds, try scrolling the page
     slightly and waiting another 10 seconds.

  ** General CAPTCHA Tips **
  - CAPTCHAs are more likely when you act too fast. Slow down your interactions.
  - If a CAPTCHA blocks progress, do NOT skip it. You must solve it to continue.
  - After solving a CAPTCHA, wait 3 seconds before your next action.

8. If a One-Time Password (OTP) / verification code screen appears:
   a. Open a NEW TAB and go to https://mail.google.com/
   b. If prompted to sign in to Gmail:
      - Click the email field and type x_uhaul_email slowly (character by character).
      - Click Next. Wait 3 seconds.
      - Click the password field and type x_uhaul_pass slowly.
      - Click Next. Wait 5 seconds for the inbox to load.
   c. Once in the inbox, look for the most recent email from U-Haul
      (sender may contain "uhaul" or "U-Haul"). Open it.
   d. Find the one-time password / verification code in the email body.
      It is usually a 6-digit number.
   e. Remember that code.
   f. Switch back to the U-Haul tab (the first tab).
   g. Click the OTP input field, type the code slowly, then submit.
9. Confirm you are signed in (look for a greeting, account icon, or "My Account" link).
   If sign-in failed, wait 5 seconds, then retry from step 1 (max 3 login attempts).

STEP 2 — Start a reservation:
1. On the homepage (or navigate back to it), find the reservation / quote form.
2. Select the moving type. Choose "One-Way" if the pickup and drop-off locations are different, otherwise choose "In-Town".
3. Fill in:
   - Picking Up: ${pickupLocation}
   - Dropping Off: ${dropoffLocation}
   - Pick-Up Date: ${pickupDate}
   - Pick-Up Time: ${pickupTime}
4. Click "Get Rates" or the equivalent search / submit button.

STEP 3 — Choose a vehicle:
1. On the results page, browse the available vehicles.
2. Look for a ${vehicleType}. Pick the cheapest option that matches "${vehicleType}" (e.g. a 10' truck if truck is requested and it is the cheapest).
3. Click the "Reserve" or "Add to Order" button for that vehicle.

STEP 4 — Add Moving Help (labor package):
${step4}

STEP 5 — Proceed through the reservation flow:
1. Continue through any remaining pages (coverage/protection options, equipment add-ons, etc.).
   - You may skip or decline optional extras unless they are required.
2. Keep clicking "Continue", "Next", or the equivalent button to advance.

STEP 6 — STOP before payment:
1. As soon as you reach a page that asks for credit card or payment information, STOP.
2. Do NOT enter any payment details. Do NOT click any "Complete Reservation" or "Place Order" button.
3. Report back that the reservation is ready for payment and summarize:
   - Vehicle selected
   - Pickup location & date/time
   - Drop-off location${step6Labor}
   - Total estimated cost shown on the page
`;
}

// ── Amazon Address Update ───────────────────────────────────────

export function buildUpdateAddressTask(args: {
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}): string {
  const {
    fullName,
    streetAddress,
    city,
    state,
    zipCode,
    country = "United States",
    phone = "",
    isDefault = true,
  } = args;

  return `
Go to https://www.amazon.com/a/addresses and do the following:

1. If prompted to sign in, enter email x_amazon_email and password x_amazon_pass to log in.
2. Click "Add address" to add a new address.
3. Fill in the address form with:
   - Full name: ${fullName}
   - Street address: ${streetAddress}
   - City: ${city}
   - State: ${state}
   - ZIP Code: ${zipCode}
   - Country: ${country}
   ${phone ? `- Phone number: ${phone}` : ""}
4. Click "Add address" to save.
${isDefault ? '5. After saving, set this address as the default delivery address.' : ""}
6. Confirm the address was saved successfully.
`;
}

// ── Amazon Furniture Cart ───────────────────────────────────────

export function buildFurnitureCartTask(furnitureItems: string[]): string {
  const numberedItems = furnitureItems
    .map((item, i) => `   ${i + 1}. ${item}`)
    .join("\n");

  return `
Go to https://www.amazon.com and do the following:

1. If prompted to sign in, enter email x_amazon_email and password x_amazon_pass to log in.

2. For each item in the following list, search for it using the Amazon search bar,
   pick the first reasonable and well-reviewed result (prioritize Prime-eligible items),
   click "Add to Cart", then return to the Amazon homepage or search bar for the next item.

   Items to add:
${numberedItems}

3. After ALL items above have been added to the cart, click on the cart icon
   and then click "Proceed to checkout".

4. STOP once the checkout/payment page loads. Do NOT enter any payment information
   and do NOT place the order.

5. Report a summary of all items in the cart and the total price.
`;
}

// ── House Analysis (GPT-4o Vision) ──────────────────────────────

export function buildHouseAnalysisPrompt(): string {
  const truckOptions = VALID_TRUCK_SIZES.map((s) => `  - ${s}`).join("\n");

  return `Analyze this photo of a house and estimate how much stuff would need to be
moved if someone were moving out of it. Based on your analysis, recommend
the most appropriate U-Haul truck size AND the number of moving helpers needed.

Consider:
- The apparent size of the house (stories, width, visible rooms/windows)
- Estimated number of bedrooms
- Estimated square footage
- Typical furniture and belongings for a home of this size
- The volume of stuff that would need to be transported

Valid U-Haul truck sizes (you MUST pick one of these exactly):
${truckOptions}

Truck size guidelines:
- Studio / 1-bedroom apartment: 8' Pickup Truck or 9' Cargo Van or 10' Truck
- 1-2 bedroom home: 12' Truck or 15' Truck
- 2-3 bedroom home: 15' Truck or 17' Truck
- 3-4 bedroom home: 20' Truck
- 4+ bedroom / large home: 26' Truck

Moving labor guidelines (number of workers):
- Studio / 1-bedroom: 2 workers
- 2-3 bedroom: 2-3 workers
- 3-4 bedroom: 3-4 workers
- 4+ bedroom / large home: 4+ workers

Respond with ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "house_description": "<brief description of the house>",
  "estimated_bedrooms": <integer>,
  "estimated_square_footage": <integer>,
  "stuff_volume_estimate": "<e.g. 800-1200 cubic feet>",
  "recommended_truck_size": "<exact string from the list above>",
  "reasoning": "<explanation of your truck size recommendation>",
  "recommended_workers": <integer>,
  "labor_reasoning": "<explanation of your worker count recommendation>"
}`;
}

// ── Furniture Recommendations (GPT-4o Vision) ───────────────────

export function buildFurnitureRecommendationPrompt(analysis: {
  estimatedBedrooms: number;
  estimatedSquareFootage: number;
  description: string;
}): string {
  return `You are a moving assistant. Based on the house details below,
recommend the furniture they will need to furnish it.

House details from prior analysis:
- Estimated bedrooms: ${analysis.estimatedBedrooms}
- Estimated sq footage: ${analysis.estimatedSquareFootage}
- Description: ${analysis.description}

For each room you can infer from the house (bedrooms, living room, dining
room, kitchen, home office, etc.), list the essential furniture items
a person would need to buy.

For each item, provide an optimized Amazon search query that would find
a good, reasonably-priced version of that item.

Mark each item as "essential" (must-have for daily living) or
"nice-to-have" (improves comfort but not strictly necessary).

Respond with ONLY valid JSON matching this schema (no markdown, no extra text):
{
  "reasoning": "<brief explanation of how you determined furniture needs>",
  "items": [
    {
      "item_name": "<e.g. Queen Bed Frame>",
      "room": "<e.g. Master Bedroom>",
      "amazon_search_query": "<e.g. queen bed frame with headboard>",
      "priority": "<essential or nice-to-have>"
    }
  ]
}`;
}

// ── GPT-4o Parsing Prompts ──────────────────────────────────────

export const REDFIN_PARSE_SYSTEM_PROMPT =
  "You extract structured rental listing data from browser agent output. " +
  "Return ONLY a JSON array of objects. Each object must have exactly these keys: " +
  "address (string), monthlyRentPrice (number), numBedrooms (number), " +
  "numBathrooms (number), squareFootage (number), moveInCost (number), url (string). " +
  "If a value is unknown, use 0 for numbers and empty string for strings. " +
  "No markdown fences, no extra text.";

export const UHAUL_PARSE_SYSTEM_PROMPT =
  "You extract structured U-Haul reservation data from browser agent output. " +
  "Return ONLY a JSON object with exactly these keys: " +
  "vehicle (string), pickupLocation (string), pickupTime (string), " +
  "dropOffLocation (string), movingHelpProvider (string), numWorkers (number), " +
  "numHours (number), totalCost (number). " +
  "If a value is unknown, use 0 for numbers and empty string for strings. " +
  "No markdown fences, no extra text.";
