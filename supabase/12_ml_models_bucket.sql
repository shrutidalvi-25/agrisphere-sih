-- Module 12: storage bucket for the trained Random Forest price-prediction
-- models (see ml/train.py, ml/export_trees.py). Public + read-only from the
-- Edge Function's perspective — these are model weights, not user data, so
-- there's nothing sensitive about public read access (same pattern as the
-- lot-photos bucket in 07_lots_offers_pooling_payments.sql).
insert into storage.buckets (id, name, public)
values ('ml-models', 'ml-models', true)
on conflict (id) do nothing;

create policy "ml model files are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'ml-models');
