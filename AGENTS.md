# STRICT EXECUTION RULE
- DO NOT EVER run `Stop-Process -Force` or `taskkill` on process name `node`.
- DeepSeek Harness itself runs on Node.js. Killing `node` kills this harness server and destroys the session.
- If Vite or esbuild hangs, only terminate the specific process by targeting its explicit PID (`Stop-Process -Id <PID>`), or simply change Vite configuration.