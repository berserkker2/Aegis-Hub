# Aegis Hub — Guia Completo de Utilização

Bem-vindo ao **Aegis Hub**! Este guia explica de forma prática como adicionar jogos, gerir capas e banners, ligar as lojas (Steam, Epic, GOG, Ubisoft, EA, Xbox), configurar a secção **Retro / Emuladores** e tirar partido das restantes funcionalidades da app.

---

## 1. Como Adicionar Jogos

O Aegis Hub suporta **3 formas principais** de adicionar jogos à tua biblioteca:

### A. Scan Automático do PC (Lojas & Registo)
1. Abre o botão **Scan PC** (ou em **Settings > Tools**).
2. O Aegis procura automaticamente jogos instalados na Steam, Epic Games, GOG, registo do Windows e pastas configuradas.
3. Se ativares a opção **Include Cloud / Owned**, também importa jogos que tens na conta mesmo sem estarem instalados no disco.
4. Seleciona os jogos que queres importar na lista e confirma.

### B. Importar uma Pasta Inteira (Jogos Standalone / DRM-Free)
1. Clica em **+ Add Game** e muda para o separador **Scan Folder**.
2. Escolhe uma pasta onde guardas jogos (ex: `D:\Games`).
3. O Aegis faz uma pesquisa recursiva por executáveis (`.exe`) e ignora ficheiros de desinstalação ou utilitários comuns.
4. Marca os jogos detetados e clica em **Import Selected**.

### C. Adicionar Jogo Manualmente (`.exe`, `.lnk`, `.bat`)
1. Clica em **+ Add Game** no separador **Single Game**.
2. Escreve o **Game Title** e clica em **Auto-Fetch Art** para preencher capa, banner, géneros e descrição automaticamente.
3. Em **Executable Path**, seleciona o `.exe` (ou `.lnk` / `.bat`) do jogo.
4. *(Opcional)* Em **Launch Options**, podes colocar parâmetros de arranque estilo Steam (ex: `-fullscreen -novid --dx11`).

> [!TIP]
> **Jogos com lançador intermédio (bootstrappers / ports de PC):**
> Alguns ports ou jogos usam um `.exe` pequeno que abre outro executável numa subpasta (como `bin\jogo.exe`) e fecha logo a seguir. Se reparares que o jogo aparece nos *Recently Played* mas o estado **Running** desaparece de imediato e não conta o tempo, edita o jogo (ícone de lápis) e aponta o **Executable Target** diretamente para o `.exe` principal do motor do jogo.

---

## 2. Sistema de Capas, Banners e Imagens

Para trocar a capa vertical (`2:3`) ou o banner de fundo (`16:9`) de qualquer jogo:
1. Abre os detalhes do jogo (ou o menu de ações no cartão) e clica em **Artwork** / ícone de imagem.
2. O seletor abre primeiro as **fontes rápidas** (Steam CDN, GOG, RAWG, SteamGridDB, Wikipedia).

### Botões e Opções no Seletor de Imagens:
* **Search:** Pesquisa novamente pelo título (podes alterar o texto na barra se o nome do jogo estiver ligeiramente diferente).
* **Search Web:** Faz uma pesquisa extra no DuckDuckGo e Internet Archive (útil para jogos muito obscuros ou mods, mantendo a abertura inicial super rápida).
* **Retro Boxart:** Liga/desliga a pesquisa automática de caixas oficiais de consola no **Libretro CDN**.
* **Custom Web URL:** Permite colar o link direto (`https://...`) de qualquer imagem da internet.
* **Upload from PC:** Permite escolher uma imagem `.jpg`, `.png` ou `.webp` guardada no teu computador.

### Dica Pro: Ativar SteamGridDB e RAWG (Grátis)
Se jogas muitos **exclusivos de consola, jogos retro, remakes ou ports de PC**, o **SteamGridDB** é a melhor fonte possível (tem capas `600×900` e banners `1920×620` em alta definição para praticamente tudo).
* **Como ativar:** Na própria janela de escolher imagens, se ainda não tiveres chave configurada, aparecem dois botões discretos em cima (**`+ SteamGridDB Key`** e **`+ RAWG Key`**). Basta clicar, obter a chave gratuita no site indicado, colar e guardar — as novas capas aparecem logo de seguida! *(Também podes gerir estas chaves em **Settings > Tools & API Keys**).*

---

## 3. Como Ligar as Diferentes Stores (E o que precisa de estar instalado)

O Aegis Hub foi desenhado para **não perder o login** a toda a hora e funcionar o mais offline possível. Podes gerir as contas em **Settings > Store Integrations**.

### Steam (Zero-Login Local)
* **Como ligar:** Não precisas de iniciar sessão no browser nem dar a tua password! O Aegis lê diretamente os ficheiros locais da Steam no teu PC (`libraryfolders.vdf`, `appmanifest_*.acf`, `localconfig.vdf`, `appinfo.vdf`).
* **Precisa da Steam instalada?** **Sim.**
  * Para detetar a tua biblioteca local (instalados e jogos na conta), a Steam tem de estar instalada no PC e com a tua conta iniciada pelo menos uma vez.
  * *Nota:* Se comprares um jogo no site/telemóvel da Steam sem abrir o cliente Steam no PC, ele só aparecerá no Aegis depois de abrires a Steam no PC para atualizar a cache local.
  * Para jogar, o Aegis lança o jogo através do cliente Steam (`steam://rungameid/...`), garantindo Achievements, Cloud Saves e Steam Input.

### GOG Galaxy
* **Como ligar:** Deteção automática via registo do Windows (para jogos instalados) e via base de dados local do GOG Galaxy (para jogos na cloud/não instalados).
* **Precisa do GOG Galaxy instalado?**
  * Para **jogos DRM-Free já instalados**: **Não** precisa do GOG Galaxy aberto — o Aegis executa o `.exe` do jogo diretamente.
  * Para importar toda a lista de jogos **Cloud / Owned** (ou instalar novos jogos GOG), convém ter o cliente GOG Galaxy instalado.
  * *Bónus Multi-Store:* Se tiveres o GOG Galaxy configurado no PC com outras lojas ligadas lá dentro, o Aegis deteta o cartão **Multi-Store Master Hub** nas Store Integrations e permite importar todos os teus títulos cloud (Steam, Epic, GOG, Ubisoft, EA) num só clique!

### Epic Games, Ubisoft Connect, EA App e Xbox PC
* **Como ligar:**
  1. **1-Click Sync (Detetado localmente):** Se já tens a app oficial da loja instalada e logada no PC, o Aegis mostra-a em *Detected Local Accounts* para sincronizar com 1 clique.
  2. **Browser Login:** Caso não seja detetada localmente, podes clicar no botão de login da respetiva loja em **Store Integrations** para sincronizar os teus jogos cloud.
* **Precisa da app da loja instalada?** **Sim** para instalar e jogar (porque estes jogos usam DRM e os protocolos oficiais da Epic, Ubisoft Connect, EA App ou Xbox/Microsoft Store).

---

## 4. Secção Retro & Emuladores

O Aegis Hub traz suporte integrado para **18+ sistemas retro e modernos** (Switch 2, Switch, PS1, PS2, PS3, PSP, GameCube, Wii, 3DS, DS, Game Boy/GBA, SNES, Mega Drive, Saturn, Dreamcast, Xbox, Xbox 360 e RetroArch).

### Passo 1: Instalar ou Configurar o Emulador
Vai a **Settings > Emulation**:
1. **Ativa a consola** que queres usar no interruptor (*toggle*) da lista.
2. Expande a consola e escolhe um dos **2 métodos de instalação**:
   * **Método Automático (Download / Install):** Nos emuladores com suporte direto (como Ryujinx, PCSX2, Dolphin, RetroArch, etc.), clica no botão de download para o Aegis descarregar a versão portátil, extrair e configurar o executável automaticamente. *(Se não houver pacote direto disponível, o botão abre o site oficial de download).*
   * **Método Manual (Já tenho instalado):** Se já tens o emulador no teu computador, clica em **Browse** e seleciona o ficheiro `.exe` do emulador.

### Passo 2: Configurar Pastas de ROMs
1. Dentro das definições desse emulador (ou clicando no ícone de definições do emulador na aba **Emulators**), adiciona uma ou mais pastas em **ROM Paths** (ex: `D:\Emulators\PS2\ISOs`).
2. *(Opcional)* Se precisares de argumentos específicos para abrir em ecrã inteiro ou sem interface, podes ajustar **Custom Launch Arguments** usando `%ROM%` no sítio onde deve entrar o ficheiro do jogo (ex: `-batch -fullscreen "%ROM%"`).
3. Também podes adicionar **Emuladores Custom** (`Add Custom Emulator`) ou **Duplicar** um emulador existente para criar perfis separados (por exemplo, duas versões diferentes do mesmo emulador), escolhendo logo, banner e extensões de ficheiros próprias.

### Passo 3: Importar ROMs e Atualizar Capas
1. Vai ao separador **Emulators** no menu lateral.
2. Clica em **Refresh ROMs** — o Aegis analisa as pastas configuradas, importa os jogos compatíveis e filtra automaticamente ficheiros de sistema/BIOS.
3. Ao lado do **Refresh ROMs**, tens o botão para **atualizar/fazer scraping das capas** automaticamente. Se alguma capa vier errada ou em falta, podes sempre abrir o jogo e escolher a capa manualmente no seletor de imagens (com **Retro Boxart** ou **SteamGridDB**).

---

## 5. Outras Funcionalidades Úteis

* **Launch Options por Jogo:** No modal de edição (lápis) ou ao adicionar um jogo, podes definir argumentos de linha de comando individuais (ex: `-novid`, `-dx11`, `-fullscreen`), que também aparecem na ficha do jogo.
* **Edição Manual de Tempo & Datas:** Em qualquer jogo (especialmente útil para emuladores ou sessões antigas), podes editar as horas/minutos jogados e a última data jogada — o gráfico semanal **Activity & Playtime** no **Aegis Pulse** atualiza automaticamente com esses valores.
* **Big Picture Mode:** Clica no ícone de TV no topo para entrar no modo de ecrã inteiro estilo consola, com deteção automática de ícones para comandos **Xbox, PlayStation e Switch Pro**, além de atalhos rápidos para apps como Discord, Spotify, Chrome e OBS.
* **Backup & Privacidade 100% Local:** Todos os teus dados ficam guardados apenas no teu PC em JSON (zero telemetria). Em **Settings > Tools & API Keys**, podes usar **Export Backup** e **Import Backup** para guardar ou restaurar toda a tua biblioteca, capas, playtime, histórico de atividade e API keys.
