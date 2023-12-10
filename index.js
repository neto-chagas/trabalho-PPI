const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");

// Lê as variáveis de ambiente do arquivo .env
dotenv.config();

// Porta do servidor
const PORT = Number(process.env.PORT || 3000);
// Chave secreta para assinar o cookie de sessão
const SUPER_SECRET_KEY = process.env.SUPER_SECRET_KEY;

// Cria o servidor
const app = express();

// Lista de usuários cadastrados
const users = [];
// Lista de mensagens enviadas no bate papo com informações do usuário e data de envio
const messages = [];

// Retorna o conteúdo HTML da página
function html(req, content, options = {}) {
  const title = options.title ?? "Página";
  const session = req.session.user;

  return /*html*/ `
    <!DOCTYPE html>
    <html lang="pt-br">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/static/css/index.css" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">

      </head>
      <body>
        <nav>
          <ul>
          ${
            session
              ? /*html*/ `<li>Olá, ${
                  session.username
                } - Último login: ${new Date(
                  session.lastLogin
                ).toLocaleString()}</li>
                <li><a href="/">Home</a></li>
                <li><a href="/logout">Sair</a></li>
                <li><a href="/cadastro">Cadastro de usuários</a></li>
                <li><a href="/batepapo">Bate papo</a></li>`
              : ""
          }
          </ul>
        </nav>

        ${content}
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>

      </body>
    </html>
  `;
}

// Configura o servidor para servir arquivos estáticos da pasta "static"
app.use("/static", express.static("static"));

const TRINTA_MINUTOS = 1000 * 60 * 30;

// Configura o servidor para usar sessões
app.use(
  session({
    secret: SUPER_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      sameSite: true,
      maxAge: TRINTA_MINUTOS,
    },
    rolling: true,
  })
);

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.session.user && req.path !== "/login") {
    res.redirect("/login");
    return;
  }

  next();
});

app.get("/", (req, res) => {
  res
    .status(200)
    .send(html(req, /*html*/ `<h1>Hello World!</h1>`, { title: "Home" }));
});

app.get("/login", (req, res) => {
  const content = /*html*/ `
    <h1>Login</h1>
    <form action="/login" method="POST">
      <label for="username">Usuário</label>
      <input type="text" name="username" placeholder="Usuário" id="username" />
      <label for="password">Senha</label>
      <input type="password" name="password" placeholder="Senha" id="password" />
      <button type="submit">Entrar</button>
    </form>
  `;

  res.status(200).send(html(req, content, { title: "Login" }));
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao encerrar a sessão");
      return;
    }

    res.redirect("/login");
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin") {
    req.session.user = {
      username,
      lastLogin: new Date(),
    };

    res.redirect("/");
    return;
  }

  res.redirect("/login");
});

app.get("/cadastro", (req, res) => {
  const errors = req.session.errors;
  req.session.errors = null;

  const content = /*html*/ `
    <h1>Cadastro de usuários</h1>
    <form action="/cadastro" method="POST">
      <div>
        <label for="username">Usuário</label>
        <input type="text" name="username" placeholder="Usuário" id="username" />
        ${errors?.username ? /*html*/ `<p>${errors.username}</p>` : ""}
      </div>
      <div>
        <label for="data">Data de nascimento</label>
        <input type="date" name="data" placeholder="Data de nascimento" id="data" />
        ${errors?.data ? /*html*/ `<p>${errors.data}</p>` : ""}
      </div>
      <div>
        <label for="nickname">Apelido</label>
        <input type="text" name="nickname" placeholder="Apelido" id="nickname" />
        ${errors?.nickname ? /*html*/ `<p>${errors.nickname}</p>` : ""}
      </div>
      <button type="submit">Cadastrar</button>
    </form>
    <table id="users-table">
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Data de nascimento</th>
          <th>Apelido</th>
        </tr>
      </thead>
      <tbody>
        ${users
          .map(
            (user) => /*html*/ `<tr>
                <td>${user.username}</td>
                <td>${user.data.toLocaleDateString()}</td>
                <td>${user.nickname}</td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;

  res.status(200).send(html(req, content, { title: "Cadastro" }));
});

app.post("/cadastro", (req, res) => {
  const { username, data, nickname } = req.body;

  if (!username || !data || !nickname) {
    req.session.errors = {
      username: !username ? "Usuário é obrigatório" : "",
      data: !data ? "Data de nascimento é obrigatório" : "",
      nickname: !nickname ? "Apelido é obrigatório" : "",
    };

    res.redirect("/cadastro");
    return;
  }

  users.push({ username, data: new Date(data), nickname });

  res.redirect("/cadastro");
});

app.get("/batepapo", (req, res) => {
  if (!users.length) {
    res.redirect("/cadastro");
    return;
  }

  const content = /*html*/ `
    <h1>Bate papo</h1>
    <form action="/batepapo" method="POST">
      <label for="message">Mensagem</label>
      <input type="text" name="message" placeholder="Mensagem" id="message" />
      <label for="username">Usuário</label>
      <select name="username" id="username">
        ${users
          .map(
            (user) =>
              /*html*/ `<option value="${user.username}">${user.username}</option>`
          )
          .join("")}
      </select>
      <button type="submit">Enviar</button>
    </form>
    <ul>
      ${messages
        .map(
          (message) =>
            /*html*/ `<li>${message.nickname} - ${
              message.message
            } - enviado em ${new Date(message.date).toLocaleString()}</li>`
        )
        .join("")}
    </ul>
  `;

  res.status(200).send(html(req, content, { title: "Bate papo" }));
});

app.post("/batepapo", (req, res) => {
  const { message, username } = req.body;

  if (!message || !username) {
    res.redirect("/batepapo");
    return;
  }

  messages.push({ message, username, date: new Date() });

  res.redirect("/batepapo");
});

app.get("*", (req, res) => {
  res.status(404).send(html(req, `<h1>Página não encontrada</h1>`));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor executando na porta: ${PORT}
Acessar http://localhost:${PORT}/`);
});

module.exports = app;