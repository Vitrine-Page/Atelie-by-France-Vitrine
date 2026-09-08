-- ==========================================
-- STORAGE - BUCKET DE PRODUTOS
-- ==========================================

insert into storage.buckets (
    id,
    name,
    public
)
values (
    'produtos',
    'produtos',
    true
)
on conflict (id)
do update set
    public = true;


-- ==========================================
-- POLICIES DO STORAGE
-- ==========================================

drop policy if exists "Admin pode enviar imagens"
on storage.objects;

drop policy if exists "Admin pode excluir imagens"
on storage.objects;


create policy "Admin pode enviar imagens"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'produtos'
);


create policy "Admin pode excluir imagens"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'produtos'
);