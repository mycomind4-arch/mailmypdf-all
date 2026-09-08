import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { buildCodeEnforcementRequestFromFairProcessHandoff } from '../../../../workflows/fairprocess-code-enforcement-handoff';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export const Route = createFileRoute('/api/integrations/fairprocess/code-enforcement-records')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!url || !key) {
          return Response.json({ error: 'Server authentication is not configured.' }, { status: 500 });
        }

        const auth = request.headers.get('authorization');
        if (!auth?.startsWith('Bearer ')) {
          return Response.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const supabase = createClient(url, key, { auth: { persistSession: false } });
        const { data: { user }, error } = await supabase.auth.getUser(auth.slice(7));
        if (error || !user) {
          return Response.json({ error: 'Invalid or expired session.' }, { status: 401 });
        }

        try {
          const body = await request.json();
          const draft = buildCodeEnforcementRequestFromFairProcessHandoff(body);
          return Response.json({
            ok: true,
            userId: user.id,
            ...draft,
            actionRequired: 'review',
            submitted: false,
            mailed: false,
          });
        } catch (handoffError) {
          return Response.json(
            {
              error: handoffError instanceof Error
                ? handoffError.message
                : 'FairProcess handoff could not be converted into a records-request draft.',
            },
            { status: 422 },
          );
        }
      },
    },
  },
});
