# Hermes Agent で Claude Pro/Max サブスクリプションを使う

## 一括セットアップ（推奨）

```bash
bash scripts/setup-hermes-claude.sh
```

スクリプトが次をまとめて実行します。

1. Claude Code CLI のインストール（既存なら `claude update`）と `claude auth login`
2. `hermes update` と Hermes 0.21.4 以上の確認
3. `hermes plugins install claude-subscription-directsdk`（既存なら update）＋ `hermes plugins enable`
4. `ANTHROPIC_API_KEY`（環境変数 / `~/.hermes/.env`）の衝突チェック
5. `hermes model` で「Claude Subscription DirectSDK (Experimental)」を選択

## 前提条件

- Hermes Agent 0.21.4 以上
- Claude Pro または Max プラン
- Node.js

## 注意

- 各ターンはサブスクリプションの Agent SDK 枠から消費されます（無制限 API ではありません）。
- 超過課金を避けるには Claude の設定で「追加使用（Usage credits）」をオフに。
- Desktop 版はプラグインカタログ →「Open in Hermes Desktop」→ Install → 再起動でも可。

参考: https://hermes-agent.nousresearch.com/docs/plugins/claude-subscription-directsdk
