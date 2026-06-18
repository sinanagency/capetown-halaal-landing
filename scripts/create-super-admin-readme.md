# create-super-admin.mjs

Creates a Supabase auth user with `owner` role in `admin_users` and sends a WhatsApp notification.

## Usage

```bash
export SUPABASE_URL="https://project.supabase.co"
export SUPABASE_SERVICE_KEY="..."
export WHATSAPP_TOKEN="..."
export WHATSAPP_PHONE_ID="..."
node scripts/create-super-admin.mjs
```

## What it does

1. Creates a Supabase auth user (or resets password if exists).
2. Upserts into `admin_users` with role `owner`.
3. Sends a WhatsApp notification with login credentials.

Edit the constants at the top of the file for email, password, phone, and name before running.
