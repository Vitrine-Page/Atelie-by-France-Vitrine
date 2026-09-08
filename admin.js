// ==========================================
// CONEXÃO COM O SUPABASE
// ==========================================

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ==========================================
// ELEMENTOS DO DOM
// ==========================================

const formulario =
    document.getElementById("produto-form");

const mensagem =
    document.getElementById("mensagem");

const listaProdutos =
    document.getElementById("lista-produtos");

const campoImagem =
    document.getElementById("imagem");

const previewContainer =
    document.getElementById("preview-container");

const btnSair =
    document.getElementById("btn-sair");


// ==========================================
// ESTADO DA APLICAÇÃO
// ==========================================

let produtoEditando = null;
let previewUrlAtual = null;


// ==========================================
// VERIFICAR LOGIN
// ==========================================

async function verificarLogin() {

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();


    if (error || !data.user) {

        window.location.href = "login.html";

        return false;
    }


    console.log(
        "Administrador autenticado:",
        data.user.email
    );


    return true;
}


// ==========================================
// SAIR DO PAINEL
// ==========================================

if (btnSair) {

    btnSair.addEventListener(
        "click",
        async () => {

            btnSair.disabled = true;
            btnSair.textContent = "Saindo...";


            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

                btnSair.disabled = false;
                btnSair.textContent = "Sair";

                return;
            }


            window.location.href =
                "login.html";

        }
    );

}


// ==========================================
// CADASTRAR / EDITAR PRODUTO
// ==========================================

if (formulario) {

    formulario.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const nome =
                document
                    .getElementById("nome")
                    .value
                    .trim();


            const descricao =
                document
                    .getElementById("descricao")
                    .value
                    .trim();


            const preco =
                Number(
                    document
                        .getElementById("preco")
                        .value
                );


            const categoria =
                document
                    .getElementById("categoria")
                    .value
                    .trim();


            const imagem =
                campoImagem?.files?.[0];


            // ======================================
            // VALIDAÇÕES
            // ======================================

            if (!nome) {

                mensagem.textContent =
                    "Digite o nome do produto.";

                return;
            }


            if (Number.isNaN(preco)) {

                mensagem.textContent =
                    "Digite um preço válido.";

                return;
            }


            // ======================================
            // EDITAR PRODUTO
            // ======================================

            if (produtoEditando) {

                await atualizarProduto({
                    nome,
                    descricao,
                    preco,
                    categoria,
                    imagem
                });

                return;
            }


            // ======================================
            // NOVO PRODUTO
            // ======================================

            await cadastrarProduto({
                nome,
                descricao,
                preco,
                categoria,
                imagem
            });

        }
    );

}


// ==========================================
// CADASTRAR PRODUTO
// ==========================================

async function cadastrarProduto({
    nome,
    descricao,
    preco,
    categoria,
    imagem
}) {

    if (!imagem) {

        mensagem.textContent =
            "Escolha uma imagem para o produto.";

        return;
    }


    mensagem.textContent =
        "Enviando imagem...";


    const nomeArquivo =
        criarNomeArquivo(imagem);


    const {
        data: arquivo,
        error: erroUpload
    } =
        await supabaseClient
            .storage
            .from("produtos")
            .upload(
                nomeArquivo,
                imagem,
                {
                    contentType: imagem.type,
                    upsert: false
                }
            );


    if (erroUpload) {

        console.error(
            "Erro no upload:",
            erroUpload
        );

        mensagem.textContent =
            "Erro ao enviar a imagem.";

        return;
    }


    console.log(
        "Imagem enviada:",
        arquivo
    );


    const imagemUrl =
        obterUrlPublica(nomeArquivo);


    if (!imagemUrl) {

        mensagem.textContent =
            "Não foi possível gerar a URL da imagem.";

        return;
    }


    mensagem.textContent =
        "Salvando produto...";


    const {
        data: produto,
        error: erroProduto
    } =
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

        console.error(
            "Erro ao salvar produto:",
            erroProduto
        );


        // Tentar remover imagem que acabou
        // sendo enviada mas não foi cadastrada
        await removerImagem(nomeArquivo);


        mensagem.textContent =
            "Erro ao salvar o produto.";

        return;
    }


    console.log(
        "Produto criado:",
        produto
    );


    mensagem.textContent =
        "Produto cadastrado com sucesso!";


    limparFormulario();


    await carregarProdutos();

}


// ==========================================
// ATUALIZAR PRODUTO
// ==========================================

async function atualizarProduto({
    nome,
    descricao,
    preco,
    categoria,
    imagem
}) {

    mensagem.textContent =
        "Atualizando produto...";


    const imagemAnteriorUrl =
        produtoEditando.imagem_url;


    let imagemUrl =
        imagemAnteriorUrl;


    let novaImagemPath = null;


    // ======================================
    // ENVIAR NOVA IMAGEM
    // ======================================

    if (imagem) {

        mensagem.textContent =
            "Enviando nova imagem...";


        novaImagemPath =
            criarNomeArquivo(imagem);


        const {
            data: arquivo,
            error: erroUpload
        } =
            await supabaseClient
                .storage
                .from("produtos")
                .upload(
                    novaImagemPath,
                    imagem,
                    {
                        contentType: imagem.type,
                        upsert: false
                    }
                );


        if (erroUpload) {

            console.error(
                "Erro no upload da nova imagem:",
                erroUpload
            );


            mensagem.textContent =
                "Erro ao enviar a nova imagem.";

            return;
        }


        console.log(
            "Nova imagem enviada:",
            arquivo
        );


        imagemUrl =
            obterUrlPublica(novaImagemPath);


        if (!imagemUrl) {

            mensagem.textContent =
                "Não foi possível gerar a nova URL.";

            await removerImagem(
                novaImagemPath
            );

            return;
        }
    }


    // ======================================
    // ATUALIZAR BANCO
    // ======================================

    mensagem.textContent =
        "Salvando alterações...";


    const {
        error: erroUpdate
    } =
        await supabaseClient
            .from("produtos")
            .update({
                nome: nome,
                descricao: descricao,
                preco: preco,
                categoria: categoria,
                imagem_url: imagemUrl
            })
            .eq(
                "id",
                produtoEditando.id
            );


    if (erroUpdate) {

        console.error(
            "Erro ao atualizar:",
            erroUpdate
        );


        // Se uma imagem nova foi enviada,
        // mas o banco falhou, remove a nova imagem.
        if (novaImagemPath) {

            await removerImagem(
                novaImagemPath
            );
        }


        mensagem.textContent =
            "Erro ao atualizar o produto.";

        return;
    }


    // ======================================
    // REMOVER IMAGEM ANTIGA
    // ======================================

    if (
        novaImagemPath &&
        imagemAnteriorUrl
    ) {

        const caminhoImagemAntiga =
            extrairCaminhoImagem(
                imagemAnteriorUrl
            );


        if (caminhoImagemAntiga) {

            await removerImagem(
                caminhoImagemAntiga
            );
        }
    }


    mensagem.textContent =
        "Produto atualizado com sucesso!";


    produtoEditando = null;


    limparFormulario();


    restaurarModoCadastro();


    await carregarProdutos();

}


// ==========================================
// CRIAR NOME ÚNICO PARA IMAGEM
// ==========================================

function criarNomeArquivo(imagem) {

    const nomeOriginal =
        imagem.name
            .replace(
                /[^a-zA-Z0-9._-]/g,
                "-"
            );


    return (
        `${Date.now()}-${nomeOriginal}`
    );
}


// ==========================================
// OBTER URL PÚBLICA
// ==========================================

function obterUrlPublica(caminho) {

    const {
        data
    } =
        supabaseClient
            .storage
            .from("produtos")
            .getPublicUrl(caminho);


    return data?.publicUrl ?? null;
}


// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {

    if (!listaProdutos) {
        return;
    }


    listaProdutos.innerHTML =
        "Carregando produtos...";


    const {
        data,
        error
    } =
        await supabaseClient
            .from("produtos")
            .select("*")
            .order(
                "criado_em",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );


        listaProdutos.innerHTML = `
            <p>
                Não foi possível carregar os produtos.
            </p>
        `;

        return;
    }


    console.log(
        "Produtos carregados:",
        data
    );


    if (!data || data.length === 0) {

        listaProdutos.innerHTML = `
            <p>
                Nenhum produto cadastrado.
            </p>
        `;

        return;
    }


    listaProdutos.innerHTML = "";


    data.forEach(produto => {

        const card =
            document.createElement(
                "div"
            );


        card.classList.add(
            "produto-admin"
        );


        card.innerHTML = `

            <img
                src="${produto.imagem_url}"
                alt="${produto.nome}"
            >

            <div class="produto-admin-info">

                <h3>
                    ${produto.nome}
                </h3>

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
                        ${
                            produto.ativo
                                ? "🟢 Ativo"
                                : "🔴 Inativo"
                        }
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
                        ${
                            produto.ativo
                                ? "🔴 Desativar"
                                : "🟢 Ativar"
                        }
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

    const {
        data,
        error
    } =
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


    document.getElementById(
        "nome"
    ).value =
        data.nome;


    document.getElementById(
        "descricao"
    ).value =
        data.descricao ?? "";


    document.getElementById(
        "preco"
    ).value =
        data.preco;


    document.getElementById(
        "categoria"
    ).value =
        data.categoria ?? "";


    // Mostrar imagem atual
    if (
        previewContainer &&
        data.imagem_url
    ) {

        limparPreview();


        previewContainer.innerHTML = `
            <img
                src="${data.imagem_url}"
                alt="${data.nome}"
            >
        `;
    }


    const botaoSalvar =
        document.querySelector(
            ".btn-salvar"
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Atualizar produto";
    }


    mensagem.textContent =
        `Editando: ${data.nome}`;


    mostrarBotaoCancelar();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ==========================================
// BOTÃO CANCELAR EDIÇÃO
// ==========================================

function mostrarBotaoCancelar() {

    if (
        document.getElementById(
            "btn-cancelar"
        )
    ) {
        return;
    }


    const botao =
        document.createElement(
            "button"
        );


    botao.id =
        "btn-cancelar";


    botao.type =
        "button";


    botao.textContent =
        "Cancelar edição";


    botao.classList.add(
        "btn-cancelar"
    );


    botao.addEventListener(
        "click",
        () => {

            produtoEditando = null;

            limparFormulario();

            restaurarModoCadastro();

            mensagem.textContent = "";

        }
    );


    formulario.appendChild(
        botao
    );
}


// ==========================================
// RESTAURAR MODO CADASTRO
// ==========================================

function restaurarModoCadastro() {

    const botaoSalvar =
        document.querySelector(
            ".btn-salvar"
        );


    if (botaoSalvar) {

        botaoSalvar.textContent =
            "Salvar produto";
    }


    const botaoCancelar =
        document.getElementById(
            "btn-cancelar"
        );


    if (botaoCancelar) {

        botaoCancelar.remove();
    }

}


// ==========================================
// ATIVAR / DESATIVAR
// ==========================================

async function alterarStatus(
    id,
    statusAtual
) {

    const novoStatus =
        !statusAtual;


    const {
        error
    } =
        await supabaseClient
            .from("produtos")
            .update({
                ativo: novoStatus
            })
            .eq(
                "id",
                id
            );


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


    await carregarProdutos();

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


    // ======================================
    // BUSCAR PRODUTO
    // ======================================

    const {
        data: produto,
        error: erroBusca
    } =
        await supabaseClient
            .from("produtos")
            .select("*")
            .eq(
                "id",
                id
            )
            .single();


    if (erroBusca) {

        console.error(
            "Erro ao buscar produto:",
            erroBusca
        );


        return;
    }


    // ======================================
    // EXCLUIR REGISTRO
    // ======================================

    const {
        error: erroDelete
    } =
        await supabaseClient
            .from("produtos")
            .delete()
            .eq(
                "id",
                id
            );


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


    // ======================================
    // EXCLUIR IMAGEM
    // ======================================

    if (produto.imagem_url) {

        const caminhoImagem =
            extrairCaminhoImagem(
                produto.imagem_url
            );


        if (caminhoImagem) {

            await removerImagem(
                caminhoImagem
            );
        }
    }


    await carregarProdutos();

}


// ==========================================
// EXTRAIR CAMINHO DA IMAGEM
// ==========================================

function extrairCaminhoImagem(url) {

    const marcador =
        "/storage/v1/object/public/produtos/";


    const indice =
        url.indexOf(marcador);


    if (indice === -1) {
        return null;
    }


    return decodeURIComponent(
        url.substring(
            indice + marcador.length
        )
    );
}


// ==========================================
// REMOVER IMAGEM DO STORAGE
// ==========================================

async function removerImagem(
    caminho
) {

    if (!caminho) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .storage
            .from("produtos")
            .remove([
                caminho
            ]);


    if (error) {

        console.error(
            "Erro ao remover imagem:",
            error
        );

    }

}


// ==========================================
// LIMPAR PRÉVIA
// ==========================================

function limparPreview() {

    if (!previewContainer) {
        return;
    }


    if (previewUrlAtual) {

        URL.revokeObjectURL(
            previewUrlAtual
        );

        previewUrlAtual = null;
    }


    previewContainer.innerHTML = `
        <p>
            Nenhuma imagem selecionada
        </p>
    `;
}


// ==========================================
// PRÉVIA DA IMAGEM
// ==========================================

if (campoImagem) {

    campoImagem.addEventListener(
        "change",
        () => {

            const arquivo =
                campoImagem.files[0];


            if (!arquivo) {

                limparPreview();

                return;
            }


            if (
                !arquivo.type.startsWith(
                    "image/"
                )
            ) {

                previewContainer.innerHTML = `
                    <p>
                        Selecione um arquivo de imagem válido.
                    </p>
                `;


                campoImagem.value = "";


                return;
            }


            if (previewUrlAtual) {

                URL.revokeObjectURL(
                    previewUrlAtual
                );
            }


            previewUrlAtual =
                URL.createObjectURL(
                    arquivo
                );


            previewContainer.innerHTML = `
                <img
                    src="${previewUrlAtual}"
                    alt="Prévia da imagem"
                >
            `;

        }
    );

}


// ==========================================
// LIMPAR FORMULÁRIO
// ==========================================

function limparFormulario() {

    if (formulario) {
        formulario.reset();
    }


    limparPreview();

}


// ==========================================
// INICIALIZAR PAINEL
// ==========================================

async function iniciarPainel() {

    const autenticado =
        await verificarLogin();


    if (!autenticado) {
        return;
    }


    await carregarProdutos();

}


// ==========================================
// INICIAR QUANDO A PÁGINA ESTIVER PRONTA
// ==========================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarPainel
    );

} else {

    iniciarPainel();

}