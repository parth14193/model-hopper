# Model Hopper (VS Code)

Model Hopper switches between AI providers based on quota availability. It supports OpenAI, Anthropic (Claude), and Google Gemini, with an extensible provider architecture.

## Features
- Monitor quota/rate limits (based on last known usage).
- Sidebar view for current quota status.
- Auto-switch providers when the preferred provider hits limits.
- Manual provider override via `Ctrl+Alt+M` (`Cmd+Alt+M` on macOS).
- Secure API key caching using VS Code secret storage.
- Status bar indicator for the active provider.
- OutputChannel logging of provider switches.

## Setup
1. Run `npm install`
2. Run `npm run build`
3. Press `F5` to launch the extension host.

## Config
Model Hopper reads `.model-hopper.json` from your workspace (configurable via `modelHopper.configPath`).

Sample config:
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
- API keys in the config are stored into Secret Storage on load.
- If no config file is found, use `Model Hopper: Open Config File` to create one.

## Commands
- `Model Hopper: Manual Provider Override`
- `Model Hopper: Test Request`
- `Model Hopper: Open Config File`

## Extending Providers
Add a new provider by implementing `ProviderClient` in `src/providers/` and registering it in `src/extension.ts`.
