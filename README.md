# pi-hostname

A Pi extension that tracks hostname context for cross-machine session sharing.

## Problem

When you share Pi sessions across multiple machines (via Dropbox, Syncthing, etc.), resuming a session on a different machine can confuse the LLM because:

- File paths may differ between machines
- Installed tools and versions may vary
- Environment variables and system state are different

## Solution

This extension records the hostname when a session is created. When you resume that session on a different machine, it automatically injects a context message informing the LLM about the machine change.

## Installation

### Via Git (once published)

```bash
pi install git:github.com/Whamp/pi-hostname
```

## Usage

The extension works automatically:

1. When you create a new session, your hostname is recorded
2. When you resume a session (`/resume`) on the same machine, nothing happens
3. When you resume a session on a **different** machine, the LLM receives:

   > System context: This session was originally created on machine "desktop". You are now on "laptop". File paths, installed tools, environment variables, and system state may differ between these machines.

### Commands

- `/hostname` - Show the hostname where the session was created vs. current machine

## How It Works

- Uses Pi's `CustomEntry` to store hostname in the session file
- Listens to `session_start` and `session_switch` events
- Injects a `CustomMessageEntry` (with `display: false`) when machine mismatch is detected
- The context message is hidden from the TUI but sent to the LLM

## License

MIT
