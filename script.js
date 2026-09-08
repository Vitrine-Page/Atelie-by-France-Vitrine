const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);



async function carregarProdutos() {
    console.log("Iniciando busca...");

    const container = document.getElementById("produtos");

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", {
            ascending: false
        });

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
        container.innerHTML = `
            <p>Erro ao carregar produtos.</p>
        `;

        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `
            <p>Nenhum produto disponível.</p>
        `;

        return;
    }

    container.innerHTML = "";

    data.forEach(produto => {
        const card = document.createElement("article");

        card.classList.add("produto");

        card.innerHTML = `
    <img
        src="${produto.imagem_url}"
        alt="${produto.nome}"
    >

    <div class="produto-info">

        <h3>${produto.nome}</h3>

        <p>${produto.descricao ?? ""}</p>

        <div class="preco">
            R$ ${Number(produto.preco)
                .toFixed(2)
                .replace(".", ",")}
        </div>

        <a
            class="btn-produto-whatsapp"
            href="${criarLinkWhatsApp(produto)}"
            target="_blank"
        >
            Falar no WhatsApp
        </a>

    </div>
`;

        container.appendChild(card);
    });
}


const WHATSAPP_NUMERO = "96991726776";

function criarLinkWhatsApp(produto) {

    const preco = Number(produto.preco)
        .toFixed(2)
        .replace(".", ",");

    const mensagem = `
Olá! Tenho interesse no produto:w

${produto.nome}

Valor: R$ ${preco}

Gostaria de saber mais informações.
`;

    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

carregarProdutos();w