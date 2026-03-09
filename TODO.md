# Cape Town Halaal - Remaining Tasks

## Supabase Setup (Required)

1. **Add API keys to Vercel:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```
   Get keys from: https://supabase.com/dashboard → Project → Settings → API

2. **Create database tables:**
   - Go to Supabase → SQL Editor
   - Run contents of `supabase-schema.sql`

3. **Add Samreen as admin:**
   - Have her sign up at `/admin/login`
   - Get her user ID from Auth dashboard
   - Run:
   ```sql
   INSERT INTO admin_users (id, email, name)
   VALUES ('her-user-id', 'samreen@email.com', 'Samreen');
   ```

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

## Optional: Email Setup (Resend)

1. Create account at resend.com
2. Verify domain cthalaal.co.za
3. Add `RESEND_API_KEY` to Vercel

## URLs

- Site: https://cthalaal.co.za
- Admin: https://cthalaal.co.za/admin (or admin.cthalaal.co.za after DNS)
- Apply: https://cthalaal.co.za/apply
- Supabase: https://zrixxywmzbasheobcdxx.supabase.co

## Files Reference

- `/apply` - Vendor application form
- `/admin` - Admin dashboard
- `/admin/applications` - Review applications
- `supabase-schema.sql` - Database schema
- `.env.local` - Local env template
