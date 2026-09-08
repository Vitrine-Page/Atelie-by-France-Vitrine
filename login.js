const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


const formulario =
    document.getElementById("login-form");

const mensagem =
    document.getElementById("login-mensagem");


formulario.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("senha").value;


    mensagem.textContent = "Entrando...";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });


    if (error) {

        console.error("Erro no login:", error);

        mensagem.textContent =
            "E-mail ou senha incorretos.";

        return;
    }


    console.log("Login realizado:", data);

    window.location.href = "admin.html";

});