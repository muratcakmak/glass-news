---
description: Deploy to Cloudflare Pages and push changes to Git repository
---

Step 1: Deploy the application to Cloudflare Pages.
// turbo
1. Run the deployment command:
   ```bash
   bun run deploy:pages
   ```

Step 2: Commit and push all changes to the Git repository.
// turbo
2. Add, commit, and push changes:
   ```bash
   git add .
   git commit -m "chore: deploy vX.X.X and update implementation"
   git push origin $(git branch --show-current)
   ```
