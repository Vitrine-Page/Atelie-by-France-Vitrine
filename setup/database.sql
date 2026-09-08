-- ==========================================
-- TEMPLATE - TABELA DE PRODUTOS
-- ==========================================

create table if not exists public.produtos (
    id uuid primary key default gen_random_uuid(),

    nome text not null,

    descricao text,

    preco numeric(10,2) not null,

    categoria text,

    imagem_url text,

    ativo boolean not null default true,

    criado_em timestamptz not null default now()
);


-- ==========================================
-- RLS
-- ==========================================

alter table public.produtos
enable row level security;


-- ==========================================
-- PERMISSÕES
-- ==========================================

grant select on public.produtos to anon;

grant select, insert, update, delete
on public.produtos
to authenticated;


revoke insert, update, delete
on public.produtos
from anon;


-- ==========================================
-- POLICIES
-- ==========================================

create policy "Produtos públicos"
on public.produtos
for select
to anon
using (
    ativo = true
);


create policy "Admin pode visualizar produtos"
on public.produtos
for select
to authenticated
using (
    true
);


create policy "Admin pode cadastrar produtos"
on public.produtos
for insert
to authenticated
with check (
    true
);


create policy "Admin pode editar produtos"
on public.produtos
for update
to authenticated
using (
    true
)
with check (
    true
);


create policy "Admin pode excluir produtos"
on public.produtos
for delete
to authenticated
using (
    true
);