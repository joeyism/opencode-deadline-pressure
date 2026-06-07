# OpenCode Deadline Pressure Plugin

OpenCode plugin that warns agents about time budget consumption and nudges handoff

## Installation

```bash
npm install opencode-deadline-pressure
```

## Features

- Tracks the execution time budget of the agent.
- Warns the agent as it approaches its timeout limit.
- Encourages the agent to finalize deliverables or summarize progress for the next worker before time expires.
- Configurable time limits and threshold percentages.

## Usage

This is a plugin for [OpenCode](https://github.com/opencode-ai). 

You can easily enable this plugin globally by adding it to your `opencode.json` (or `opencode.jsonc`) configuration file under the `plugins` array.

```json
{
  "plugins": [
    "opencode-deadline-pressure"
  ]
}
```

Once added to your configuration, OpenCode will automatically load and activate the plugin whenever it starts.

Alternatively, if you are configuring OpenCode programmatically via the SDK, you can register it like this:

```typescript
import { configureAgent } from '@opencode-ai/sdk';
import plugin from 'opencode-deadline-pressure';

const agent = configureAgent({
  plugins: [
    plugin({
      // Provide configuration options here
    })
  ]
});
```

## License

[MIT](LICENSE)
