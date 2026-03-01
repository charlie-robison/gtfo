# Optimization Agent Rules

## DO NOT run skills/server code directly

When optimizing browser-use skills, **never** run the test command yourself. Running scripts that call `load_dotenv()` and launch browser sessions can:

- Override environment variables and redirect traffic away from the dev's ngrok server
- Steal browser focus/ports from already-running sessions
- Interfere with active DoorDash, Southwest, or other skill runs happening on the same machine

## What to do instead

1. **Make the code changes** (add `initial_actions`, `max_steps`, `max_actions_per_step`, `use_judge=False`, streamline prompts, etc.)
2. **Give the user the test command** to run themselves — do not execute it
3. **Wait for the user to explicitly tell you to run it** before executing any test command
4. If the user asks you to run it, then you can — but only after they give the green light

## Test command template

```bash
cd /Users/kaushikskaja/Documents/GitHub/gtfo && python3 -c "
import asyncio, time
from server.skills.SKILL_MODULE import SKILL_FUNCTION
async def main():
    start = time.time()
    result = await SKILL_FUNCTION(
        # args here
    )
    print(f'\n\nTOTAL TIME: {time.time()-start:.1f}s')
    print(f'Result type: {type(result).__name__}')
    print(str(result)[:3000])
asyncio.run(main())
"
```

## Common optimizations checklist

- [ ] `initial_actions` — pre-navigate to the target URL
- [ ] `max_steps` — cap execution (typically 5-10)
- [ ] `max_actions_per_step=10` — allow batching multiple actions per LLM call
- [ ] `use_judge=False` — skip verification overhead
- [ ] `use_vision=False` — DOM-only mode, faster per step (use when task is form-filling, not visual)
- [ ] `enable_default_extensions=False` on Browser config
- [ ] Streamline task prompt — remove artificial delays ("wait 2-4 seconds"), remove redundant navigation steps
- [ ] Use `AMAZON_EMAIL` / `AMAZON_PASSWORD` from env (not skill-specific email vars)
- [ ] `sensitive_data` keys: `x_amazon_email`, `x_amazon_pass`
