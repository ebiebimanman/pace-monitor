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
src/
  App.tsx        画面全体の組み立てと記録の更新
  components/    グラフ、パネル、モーダル（チェックイン・集中切れた・設定・初回設定）
  hooks/         保存（useStore）、天気（useWeather）、現在時刻、通知、1 画面レイアウト
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
npm test        # ロジックと通知判定のテスト（狭山市 2026-10-01 のデータで検証）
npm run build
```

## v1 でできること

- 初回設定（仕事時間・昼休み・いつもの睡眠・場所・通知）
- 朝のチェックイン（睡眠・体調・症状・冷暖房と設定温度）。その日最初の表示で自動で開く
- 今日のコンディション（%）と内訳、時間帯ごとの曲線、ペースダウン時間、いまの詳細
- 換気・休憩・水のワンタップ記録（取り消し可）
- 「集中切れた」→ 対処法を効きそうな順に提案。複数「やってみる」可
- 15 分後のふりかえり、よく効く対処の集計
- タブを開いている間のブラウザ通知（ペースダウン 5 分前・チェックイン未回答・換気休憩のひとこと）
- データのコピー（JSON）と全削除

カレンダー連携・ログイン・Web Push は v2 以降（docs/spec.md の 8 章）。
