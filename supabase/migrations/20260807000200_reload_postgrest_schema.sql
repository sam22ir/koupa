-- Ensure the API exposes the nearby RPC after the function migration is applied.
select pg_notify('pgrst', 'reload schema');
