# Model Hopper (VS Code)

Model Hopper routes AI requests across multiple providers and automatically falls back when quota is near exhaustion or a provider fails.

## Highlights
- Priority-based provider routing across OpenAI, Anthropic (Claude), and Gemini.
- Automatic fallback when quota crosses threshold or request/auth errors occur.
- Manual override from command palette or status bar click.
- Provider quota sidebar with configured-state and last error visibility.
- Secure API key storage in VS Code Secret Storage.
- Dedicated logs via `Model Hopper` Output Channel.

## Quick Start
1. Install dependencies:
```bash
npm install
```
2. Build:
```bash
npm run build
```
3. Launch extension host from VS Code:
`F5`
4. Run command:
`Model Hopper: Open Config File`

## Configuration
Model Hopper reads a workspace config file (default `.model-hopper.json`), controlled by `modelHopper.configPath`.

```json
{
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-...",
    "gemini": "AIza..."
  },
  "priorityOrder": ["openai", "anthropic", "gemini"],
  "quotaRefreshMinutes": 60,
  "alertThresholdPercent": 80,
  "providers": {
    "openai": { "model": "gpt-4.1-mini" },
    "anthropic": { "model": "claude-3-5-sonnet-latest" },
    "gemini": { "model": "gemini-1.5-pro" }
  }
}
```

Notes:
- API keys found in config are saved to Secret Storage on load.
- Missing or duplicate providers in `priorityOrder` are normalized automatically.
- `alertThresholdPercent` is clamped to `1..100`.
- `quotaRefreshMinutes` is normalized to a positive integer.

## Commands
- `Model Hopper: Manual Provider Override`
- `Model Hopper: Test Request`
- `Model Hopper: Open Config File`
- `Model Hopper: Refresh Providers`
- `Model Hopper: Show Logs`

## Status Bar
- Shows current active provider and model.
- Shows manual override state when set.
- Click it to open manual override picker.

## Sidebar
`Model Hopper > Provider Quotas` displays:
- Last known quota usage.
- Not configured providers.
- Last provider error (including auth failures).

## Development
- `npm run build`: compile extension
- `npm run watch`: compile in watch mode

## Extending Providers
1. Implement `ProviderClient` in `src/providers/`.
2. Register the provider in `src/extension.ts`.
3. Add config and command surface as needed.
