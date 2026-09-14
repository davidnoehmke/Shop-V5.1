-- Read-only review helpers for ChatGPT/agent tooling.

-- Pending candidates, newest first.
select
  id,
  approval_token,
  candidate_type,
  status,
  research_payload,
  validation_payload,
  diversity_payload,
  product_payload,
  article_id,
  target_system,
  target_repository,
  target_branch,
  created_at
from public.content_approval_queue
where status = 'pending_review'
order by created_at asc;

-- A sync executor must additionally re-read the exact row by BOTH id and approval_token
-- and assert status = 'sync_ready' immediately before any external write.
