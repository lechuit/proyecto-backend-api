// Temporal: apply indices on first startup
import { addFullTextIndices } from './scripts/addFullTextIndices';

// Al final del server.ts, antes de app.listen
if (process.env.NODE_ENV === 'production' && process.env.APPLY_INDICES === 'true') {
  addFullTextIndices()
    .then(() => console.log('✅ Full-text indices applied'))
    .catch(err => console.error('❌ Error applying indices:', err));
}
