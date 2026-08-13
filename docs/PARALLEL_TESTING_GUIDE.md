# Parallel Testing Guide

Each simultaneously running version must use an isolated source folder and isolated runtime resources.

Example:

```text
Venture-Studio-OS-main       -> port 3000 -> runtime/main
Venture-Studio-OS-budget     -> port 3001 -> runtime/budget
Venture-Studio-OS-book-ui    -> port 3002 -> runtime/book-ui
```

Every development interface must visibly display its environment name, branch, version, and port.
