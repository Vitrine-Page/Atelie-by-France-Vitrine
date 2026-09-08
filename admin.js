const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// ==========================================
// PROTEGER PAINEL ADMINISTRATIVO
// ==========================================

async function verificarLogin() {

    const { data, error } =
        await supabaseClient.auth.getUser();

    if (error || !data.user) {

        window.location.href = "login.html";

        return false;
    }

    return true;
}

verificarLogin();


// ==========================================
// SAIR DO PAINEL
// ==========================================

const btnSair = document.getElementById("btn-sair");

if (btnSair) {

    btnSair.addEventListener("click", async () => {

        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {

            console.error(
                "Erro ao sair:",
                error
            );

            return;
        }

        window.location.href = "login.html";
    });
}

const formulario = document.getElementById("produto-form");
const mensagem = document.getElementById("mensagem");
const listaProdutos = document.getElementById("lista-produtos");

const campoImagem =
    document.getElementById("imagem");

const previewContainer =
    document.getElementById("preview-container");


let produtoEditando = null;


// ==========================================
// CADASTRAR / EDITAR PRODUTO
// ==========================================

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const preco = Number(document.getElementById("preco").value);
    const categoria = document.getElementById("categoria").value.trim();
    const imagem = document.getElementById("imagem").files[0];

    // ======================================
    // EDITAR PRODUTO
    // ======================================

    if (produtoEditando) {

        mensagem.textContent = "Atualizando produto...";

        let imagemUrl = produtoEditando.imagem_url;

        // Se escolheu uma nova imagem
        if (imagem) {

            mensagem.textContent = "Enviando nova imagem...";

            const nomeArquivo =
                `${Date.now()}-${imagem.name}`;

            const { data: arquivo, error: erroUpload } =
                await supabaseClient
                    .storage
                    .from("produtos")
                    .upload(nomeArquivo, imagem, {
                        contentType: imagem.type,
                        upsert: false
                    });

            if (erroUpload) {
                console.error("Erro no upload:", erroUpload);
                mensagem.textContent =
                    "Erro ao enviar a nova imagem.";
                return;
            }

            console.log("Nova imagem enviada:", arquivo);

            const { data: urlImagem } =
                supabaseClient
                    .storage
                    .from("produtos")
                    .getPublicUrl(nomeArquivo);

            imagemUrl = urlImagem.publicUrl;
        }

        const { error: erroUpdate } =
            await supabaseClient
                .from("produtos")
                .update({
                    nome: nome,
                    descricao: descricao,
                    preco: preco,
                    categoria: categoria,
                    imagem_url: imagemUrl
                })
                .eq("id", produtoEditando.id);

        if (erroUpdate) {
            console.error("Erro ao atualizar:", erroUpdate);
            mensagem.textContent =
                "Erro ao atualizar o produto.";
            return;
        }

        mensagem.textContent =
            "Produto atualizado com sucesso!";

        produtoEditando = null;

        formulario.reset();

        previewContainer.innerHTML =
            "<p>Nenhuma imagem selecionada</p>";

        restaurarModoCadastro();

        carregarProdutos();

        return;
    }


    // ======================================
    // NOVO PRODUTO
    // ======================================

    if (!imagem) {
        mensagem.textContent =
            "Escolha uma imagem para o produto.";
        return;
    }

    mensagem.textContent = "Enviando imagem...";

    const nomeArquivo =
        `${Date.now()}-${imagem.name}`;

    const { data: arquivo, error: erroUpload } =
        await supabaseClient
            .storage
            .from("produtos")
            .upload(nomeArquivo, imagem, {
                contentType: imagem.type,
                upsert: false
            });

    if (erroUpload) {
        console.error("Erro no upload:", erroUpload);
        mensagem.textContent =
            "Erro ao enviar a imagem.";
        return;
    }

    console.log("Imagem enviada:", arquivo);

    const { data: urlImagem } =
        supabaseClient
            .storage
            .from("produtos")
            .getPublicUrl(nomeArquivo);

    const imagemUrl = urlImagem.publicUrl;

    mensagem.textContent = "Salvando produto...";

    const { data: produto, error: erroProduto } =
        await supabaseClient
            .from("produtos")
            .insert({
                nome: nome,
                descricao: descricao,
                preco: preco,
                categoria: categoria,
                imagem_url: imagemUrl,
                ativo: true
            })
            .select()
            .single();

    if (erroProduto) {
        console.error("Erro ao salvar produto:", erroProduto);
        mensagem.textContent =
            "Erro ao salvar o produto.";
        return;
    }

    console.log("Produto criado:", produto);

    mensagem.textContent =
        "Produto cadastrado com sucesso!";

    formulario.reset();

    previewContainer.innerHTML =
        "<p>Nenhuma imagem selecionada</p>";

    carregarProdutos();
});


// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {

    listaProdutos.innerHTML =
        "Carregando produtos...";

    const { data, error } =
        await supabaseClient
            .from("produtos")
            .select("*")
            .order("criado_em", {
                ascending: false
            });

    if (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );

        listaProdutos.innerHTML =
            "<p>Não foi possível carregar os produtos.</p>";

        return;
    }

    if (!data || data.length === 0) {

        listaProdutos.innerHTML =
            "<p>Nenhum produto cadastrado.</p>";

        return;
    }

    listaProdutos.innerHTML = "";

    data.forEach(produto => {

        const card =
            document.createElement("div");

        card.classList.add("produto-admin");

        card.innerHTML = `

            <img
                src="${produto.imagem_url}"
                alt="${produto.nome}"
            >

            <div class="produto-admin-info">

                <h3>${produto.nome}</h3>

                <p>
                    ${produto.descricao ?? ""}
                </p>

                <strong>
                    R$ ${Number(produto.preco)
                .toFixed(2)
                .replace(".", ",")}
                </strong>

                <p>
                    Categoria:
                    ${produto.categoria ?? "Sem categoria"}
                </p>

                <p>
                    Status:
                    <strong>
                        ${produto.ativo
                ? "🟢 Ativo"
                : "🔴 Inativo"}
                    </strong>
                </p>

                <div class="acoes-produto">

                    <button
                        class="btn-editar"
                        onclick="editarProduto('${produto.id}')"
                    >
                        ✏️ Editar
                    </button>

                    <button
                        class="btn-status"
                        onclick="alterarStatus('${produto.id}', ${produto.ativo})"
                    >
                        ${produto.ativo
                ? "🔴 Desativar"
                : "🟢 Ativar"}
                    </button>

                    <button
                        class="btn-excluir"
                        onclick="excluirProduto('${produto.id}')"
                    >
                        🗑️ Excluir
                    </button>

                </div>

            </div>
        `;

        listaProdutos.appendChild(card);
    });
}


// ==========================================
// EDITAR PRODUTO
// ==========================================

async function editarProduto(id) {

    const { data, error } =
        await supabaseClient
            .from("produtos")
            .select("*")
            .eq("id", id)
            .single();

    if (error) {

        console.error(
            "Erro ao buscar produto:",
            error
        );

        return;
    }

    produtoEditando = data;

    document.getElementById("nome").value =
        data.nome;

    document.getElementById("descricao").value =
        data.descricao ?? "";

    document.getElementById("preco").value =
        data.preco;

    document.getElementById("categoria").value =
        data.categoria ?? "";

    document.querySelector(".btn-salvar").textContent =
        "Atualizar produto";

    mensagem.textContent =
        `Editando: ${data.nome}`;

    mostrarBotaoCancelar();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ==========================================
// CANCELAR EDIÇÃO
// ==========================================

function mostrarBotaoCancelar() {

    if (document.getElementById("btn-cancelar")) {
        return;
    }

    const botao =
        document.createElement("button");

    botao.id = "btn-cancelar";
    botao.type = "button";
    botao.textContent = "Cancelar edição";

    botao.classList.add("btn-cancelar");

    botao.onclick = () => {
        produtoEditando = null;

        formulario.reset();

        previewContainer.innerHTML =
            "<p>Nenhuma imagem selecionada</p>";

        restaurarModoCadastro();

        mensagem.textContent = "";
    };

    formulario.appendChild(botao);
}


function restaurarModoCadastro() {

    document.querySelector(".btn-salvar").textContent =
        "Salvar produto";

    const botaoCancelar =
        document.getElementById("btn-cancelar");

    if (botaoCancelar) {
        botaoCancelar.remove();
    }
}


// ==========================================
// ATIVAR / DESATIVAR
// ==========================================

async function alterarStatus(id, statusAtual) {

    const novoStatus = !statusAtual;

    const { error } =
        await supabaseClient
            .from("produtos")
            .update({
                ativo: novoStatus
            })
            .eq("id", id);

    if (error) {

        console.error(
            "Erro ao alterar status:",
            error
        );

        alert(
            "Não foi possível alterar o status."
        );

        return;
    }

    carregarProdutos();
}


// ==========================================
// EXCLUIR PRODUTO
// ==========================================

async function excluirProduto(id) {

    const confirmar =
        confirm(
            "Tem certeza que deseja excluir este produto?"
        );

    if (!confirmar) {
        return;
    }

    // Buscar produto
    const { data: produto, error: erroBusca } =
        await supabaseClient
            .from("produtos")
            .select("*")
            .eq("id", id)
            .single();

    if (erroBusca) {

        console.error(
            "Erro ao buscar produto:",
            erroBusca
        );

        return;
    }


    // Excluir registro do banco
    const { error: erroDelete } =
        await supabaseClient
            .from("produtos")
            .delete()
            .eq("id", id);

    if (erroDelete) {

        console.error(
            "Erro ao excluir produto:",
            erroDelete
        );

        alert(
            "Não foi possível excluir o produto."
        );

        return;
    }


    // Excluir imagem do Storage
    if (produto.imagem_url) {

        try {

            const marcador =
                "/storage/v1/object/public/produtos/";

            const indice =
                produto.imagem_url.indexOf(marcador);

            if (indice !== -1) {

                const caminho =
                    decodeURIComponent(
                        produto.imagem_url.substring(
                            indice + marcador.length
                        )
                    );

                const { error: erroImagem } =
                    await supabaseClient
                        .storage
                        .from("produtos")
                        .remove([caminho]);

                if (erroImagem) {
                    console.error(
                        "Erro ao excluir imagem:",
                        erroImagem
                    );
                }
            }

        } catch (erro) {

            console.error(
                "Erro ao processar imagem:",
                erro
            );
        }
    }

    carregarProdutos();
}


// ==========================================
// CARREGAR PRODUTOS AO ABRIR O PAINEL
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();
});

// ==========================================
// PRÉVIA DA IMAGEM
// ==========================================

campoImagem.addEventListener("change", () => {

    const arquivo = campoImagem.files[0];

    // Nenhuma imagem selecionada
    if (!arquivo) {

        previewContainer.innerHTML =
            "<p>Nenhuma imagem selecionada</p>";

        return;
    }

    // Verificar se é realmente uma imagem
    if (!arquivo.type.startsWith("image/")) {

        previewContainer.innerHTML =
            "<p>Selecione um arquivo de imagem válido.</p>";

        campoImagem.value = "";

        return;
    }

    // Criar prévia
    const url =
        URL.createObjectURL(arquivo);

    previewContainer.innerHTML = `
        <img
            src="${url}"
            alt="Prévia da imagem"
        >
    `;
});