#!/usr/bin/env bash
# Hermes Agent で Claude Pro/Max サブスクリプションを使うための一括セットアップ
# 使い方: bash scripts/setup-hermes-claude.sh
set -euo pipefail

PLUGIN="claude-subscription-directsdk"
PROVIDER="claude-subscription-directsdk-experimental"
MIN_HERMES="0.21.4"

info() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

# 0. 前提チェック
command -v node >/dev/null || die "Node.js が必要です。https://nodejs.org からインストールしてください。"
command -v npm  >/dev/null || die "npm が見つかりません。"
command -v hermes >/dev/null || die "hermes コマンドが見つかりません。先に Hermes Agent をインストールしてください。"

# 1. Claude Code CLI のインストール/更新 とログイン
if command -v claude >/dev/null; then
  info "Claude Code CLI を更新します"
  claude update || warn "claude update に失敗しました（続行します）"
else
  info "Claude Code CLI をインストールします"
  npm install -g @anthropic-ai/claude-code
fi

if claude auth status 2>/dev/null | grep -Eq '"?loggedIn"?:[[:space:]]*true'; then
  info "Claude にログイン済みです"
else
  info "ブラウザで Claude (Pro/Max) アカウントにログインしてください"
  claude auth login
  claude auth status | grep -Eq '"?loggedIn"?:[[:space:]]*true' || die "ログインを確認できませんでした。"
fi

# 2. Hermes を更新しバージョン確認
info "Hermes を更新します"
hermes update || warn "hermes update に失敗しました（Desktop版は Settings → About → Update now）"
HV="$(hermes --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)"
if [ -n "$HV" ]; then
  if [ "$(printf '%s\n%s\n' "$MIN_HERMES" "$HV" | sort -V | head -1)" != "$MIN_HERMES" ]; then
    die "Hermes $HV は古すぎます（$MIN_HERMES 以上が必要）。"
  fi
  info "Hermes $HV を確認しました"
else
  warn "Hermes のバージョンを判定できませんでした。$MIN_HERMES 以上か手動で確認してください。"
fi

# 3. プラグインのインストール（既存なら更新）＋有効化
if hermes plugins install "$PLUGIN"; then
  info "プラグインをインストールしました"
else
  info "インストール済みのため更新します"
  hermes plugins update "$PLUGIN"
fi
# 一部バージョンでは install 後に無効のままになるため明示的に有効化
hermes plugins enable "$PROVIDER" 2>/dev/null || true

# 4. ANTHROPIC_API_KEY の衝突チェック
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  warn "環境変数 ANTHROPIC_API_KEY が設定されています。このプロバイダーは動作しません。"
  warn "実行前に: unset ANTHROPIC_API_KEY  （シェル設定ファイルからも削除してください）"
fi
ENVF="$HOME/.hermes/.env"
if [ -f "$ENVF" ] && grep -Eq '^[[:space:]]*ANTHROPIC_API_KEY=' "$ENVF"; then
  read -r -p "$ENVF の ANTHROPIC_API_KEY をコメントアウトしますか? [y/N] " ans
  if [[ "$ans" =~ ^[Yy]$ ]]; then
    cp "$ENVF" "$ENVF.bak"
    sed -i.tmp -E 's/^([[:space:]]*ANTHROPIC_API_KEY=)/# \1/' "$ENVF" && rm -f "$ENVF.tmp"
    info "コメントアウトしました（バックアップ: $ENVF.bak）"
  else
    warn "ANTHROPIC_API_KEY が残っているとプロバイダーは動作しません。"
  fi
fi

# 5. モデル選択
info "一覧から「Claude Subscription DirectSDK (Experimental)」とモデルを選んでください"
hermes model

cat <<MSG

セットアップ完了。お試し起動:
  hermes --provider $PROVIDER -m sonnet

※ 超過課金を避けるには claude.ai の設定で「追加使用（Usage credits）」をオフにしてください。
MSG
