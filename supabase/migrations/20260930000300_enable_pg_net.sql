-- The notification dispatch cron job calls the dispatch-notifications edge
-- function with net.http_post, which lives in pg_net. Staging had the extension
-- from a manual setup and production did not, so the job failed every minute
-- there with `schema "net" does not exist`. Recording it here keeps every
-- environment the same.
create extension if not exists pg_net;
