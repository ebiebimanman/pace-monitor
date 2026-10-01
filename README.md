# ペース予報

仕事中に集中が下がりやすい時間（ペースダウン時間）を、睡眠・体調・時間帯・天気・換気や休憩の経過から予測し、集中が切れたときの対処法を出す Web サイト。

- 仕様：[docs/spec.md](docs/spec.md)
- プロトタイプ：https://claude.ai/artifact/9nbytuHvLabxcRFtGQHuzG

## 構成

| 項目 | 採用 |
|---|---|
| フレームワーク | Vite + React + TypeScript（静的 SPA） |
| データ | ブラウザの localStorage（ログインなし） |
| 天気・場所検索 | Open-Meteo（API キー不要、ブラウザから直接呼ぶ） |
| テスト | Vitest |
| 公開先（予定） | Vercel（静的ホスティング） |

```
src/lib/
  types.ts       データの型
  time.ts        時刻の変換・表示
  weather.ts     Open-Meteo の取得と補間
  humidity.ts    推定室内湿度
  condition.ts   今日のコンディション・曲線・ペースダウン区間
  causes.ts      「集中切れた」の対処候補
  storage.ts     localStorage
icons/           記録・カレンダーのアイコン
```

## 開発

```sh
npm install
npm run dev     # 開発サーバー
npm test        # ロジックのテスト（狭山市 2026-10-01 のデータで検証）
npm run build
```
