# Local Setup Instructions

## Getting the Changes on Your Local Machine

The scraper code was developed and pushed to the branch `claude/frontend-backend-integration-01PHK7iTa9bB4BLbRwu33nP2`. 

Here's how to get it on your Mac:

### Option 1: Pull the Branch (Recommended)

```bash
# Make sure you're in the manga-app directory
cd ~/projects/manga-app

# Fetch all branches from GitHub
git fetch origin

# Switch to the feature branch
git checkout claude/frontend-backend-integration-01PHK7iTa9bB4BLbRwu33nP2

# Pull the latest changes
git pull origin claude/frontend-backend-integration-01PHK7iTa9bB4BLbRwu33nP2
```

### Option 2: Merge to Main First

If you want to merge the PR first, then pull main:

```bash
# 1. Go to GitHub and merge PR #1
# https://github.com/LeeJunC/manga-app/pull/1

# 2. Then on your Mac:
git checkout main
git pull origin main
```

---

## After Pulling the Changes

1. **Install new dependencies:**
```bash
npm install
```

2. **Create .env.local file:**
```bash
cat > .env.local << 'EOF'
MONGODB_URI=mongodb+srv://leejun706_db_user:xV0oJli2Xh6mSRQw@cluster0.kfkhrfc.mongodb.net/manga?retryWrites=true&w=majority&appName=Cluster0
EOF
```

3. **Start the dev server:**
```bash
npm run dev
```

4. **Test the API** (in another terminal):
```bash
# Search for manga
curl -X POST http://localhost:3000/api/manga/search \
  -H "Content-Type: application/json" \
  -d '{"query": "One Piece", "source": "mangadex"}'
```

---

## Verify You Have the New Files

After pulling, you should see these new directories:
```bash
ls -la app/api/manga/
ls -la lib/scrapers/
ls -la lib/models/
```

If you see those directories, you're good to go!

---

## Troubleshooting

### "Cannot find module" error?
- Make sure you ran `npm install` after pulling
- Make sure you're on the correct branch: `git branch` (should show the claude/* branch)

### MongoDB connection errors?
- Make sure `.env.local` exists with the MONGODB_URI
- Check that your MongoDB Atlas cluster is accessible

### Port 3000 already in use?
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```
