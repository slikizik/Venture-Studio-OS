# Parallel Environment Rules

For software changes requiring simultaneous execution, enforce:

> One change = one branch = one worktree = one port = one development database = one runtime storage area.

Each environment must have:

- unique environment ID;
- branch and worktree path;
- unique local port;
- isolated database;
- isolated uploads, cache, sessions, exports, and logs;
- visible environment banner;
- recorded start and stop commands.

Environment records are stored in `11-runtime-governance/ENVIRONMENTS.yaml`.

Never allow test or feature environments to write to the verified-main database or storage.
