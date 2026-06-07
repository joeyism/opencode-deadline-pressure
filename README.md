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

This is a plugin for [OpenCode](https://github.com/opencode-ai). You can register it in your OpenCode configuration or agent setup:

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
