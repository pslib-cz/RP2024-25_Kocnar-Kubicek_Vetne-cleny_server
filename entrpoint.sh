#!/bin/sh

# Ensure files exist in /data (copy defaults if needed)
[ -f /data/sets.json ] || cp /app/sets.json /data/sets.json
[ -f /data/types.json ] || cp /app/types.json /data/types.json

# Remove any existing files or symlinks in /app
rm -f /app/sets.json /app/types.json

# Create symlinks in /app pointing to /data
ln -s /data/sets.json /app/sets.json
ln -s /data/types.json /app/types.json

# Run the app
exec bun run index.ts