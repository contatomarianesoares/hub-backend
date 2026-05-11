# Deploy com GitHub Actions

## ✅ Configuração Automática

Cada vez que você faz `git push` para `main` ou `master`, o GitHub Actions faz deploy automático!

---

## 🔧 Setup Necessário (UMA VEZ APENAS)

### 1️⃣ Copiar SSH Key para GitHub Secrets

**No seu Mac, execute:**

```bash
# Ler a chave privada
cat ~/.ssh/id_rsa_emeez | pbcopy
```

A chave está copiada na área de transferência ✅

### 2️⃣ Adicionar Secret no GitHub

1. Acesse: https://github.com/contatomarianesoares/hub-backend
2. Vá em: **Settings** → **Secrets and variables** → **Actions**
3. Clique em: **New repository secret**
4. **Name**: `SSH_PRIVATE_KEY`
5. **Value**: Cole a chave (Ctrl+V ou Cmd+V)
6. Clique: **Add secret**

**Pronto! ✅**

---

## 🚀 Como Fazer Deploy

**Simples assim:**

```bash
# 1. Faça suas mudanças
# 2. Commit e push
git add .
git commit -m "fix: corrigir webhook"
git push origin main

# 3. Pronto! GitHub Actions faz o resto automaticamente
```

---

## 📊 Monitorar Deploy

1. Acesse: https://github.com/contatomarianesoares/hub-backend
2. Clique em: **Actions**
3. Veja o status do seu deploy em tempo real

### Cores:
- 🟡 **Amarelo**: Executando
- 🟢 **Verde**: Sucesso ✅
- 🔴 **Vermelho**: Erro ❌

---

## 🔍 Ver Logs do Deploy

1. Clique no workflow em execução
2. Clique em: **deploy**
3. Expanda: **Deploy to server**
4. Veja todos os detalhes:
   ```
   🚀 Iniciando deploy do hub-backend...
   📥 Atualizando repositório...
   📦 Instalando dependências...
   ✅ Iniciando hub-backend com PM2...
   🎉 Deploy concluído com sucesso!
   ```

---

## 🛑 Se der erro

### Erro: "Permission denied (publickey)"
- **Causa**: SSH Key não foi adicionada corretamente
- **Solução**: 
  1. Delete o secret `SSH_PRIVATE_KEY` no GitHub
  2. Copie novamente: `cat ~/.ssh/id_rsa_emeez | pbcopy`
  3. Adicione novo secret

### Erro: "npm command not found"
- **Causa**: npm não instalado no servidor
- **Solução**: SSH para o servidor e instale:
  ```bash
  ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

### Erro: "git clone permission denied"
- **Causa**: Repositório privado sem acesso
- **Solução**: Se for privado, adicione:
  ```bash
  # No servidor:
  ssh-keyscan -H github.com >> ~/.ssh/known_hosts
  # E configure chave SSH do GitHub
  ```

---

## 📍 Verificar se está rodando

```bash
# Testar endpoint local
curl http://localhost:3000/health

# Ou via domínio
curl https://hub.jurialvo.com.br/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-05-11T22:17:12.901Z"
}
```

---

## 🔄 Gerenciar com PM2

**No servidor:**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs hub-backend

# Parar
pm2 stop hub-backend

# Reiniciar
pm2 restart hub-backend

# Deletar
pm2 delete hub-backend
```

---

## 📦 Arquivos de Deployment

- `.github/workflows/deploy.yml` ← Workflow GitHub Actions
- `ecosystem.config.js` ← Configuração PM2
- `.env` ← Variáveis de ambiente (criado automaticamente)

---

## ✨ Resumo

| Ação | Comando |
|------|---------|
| Fazer deploy | `git push origin main` |
| Ver status | GitHub → Actions |
| Ver logs | GitHub Actions UI ou `pm2 logs` |
| SSH servidor | `ssh -i ~/.ssh/id_rsa_emeez ubuntu@152.67.53.192` |

---

**Pronto! Seu deploy está automatizado 🎉**
