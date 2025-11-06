#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

# Install dependencies
npm install

# Login into Supabase
npx supabase login


PROMPT="Would you like to create a new Supabase project or use an existing one?"
OPTIONS=('Create new' 'Use existing')
source scripts/menu.sh

if [ "$SI" == "0" ]; then
    npx supabase projects create
else
    npx supabase link
fi