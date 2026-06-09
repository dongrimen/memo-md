# 新サービス（同意書取得ウィザード）技術選定およびアーキテクチャ設計書

本書は、既存のFuelPHPシステム環境に新サービス（同意書取得ウィザード機能）をSPAとして追加開発するためのアーキテクチャ、技術選定、および将来的なLaravel 12への完全リプレイスを見据えた設計方針をまとめた定義書です。

---

## 1. システム概要と開発方針

既存のFuelPHP環境（EOL考慮）と共存しつつ、新規機能はモダンなReactアプリケーションとして構築します。

最大の開発方針は**「フロントエンド（React）をバックエンドの実装に一切依存させないこと」**です。これにより、将来APIサーバーをモダンフレームワークへ作り直した際も、フロントエンド側のコードを無傷で移行できる状態を実現します。

---

## 2. インフラ・ルーティング構成

既存システムに影響を与えないため、Webサーバー（Nginx / Apache）のレイヤーでURLパスを検知し、完全に独立したルーティングを行います。

* **`/` などの既存パス**: 既存のFuelPHPおよび関連サービスへルーティング
* **`/new-service/`（新規SPA）**: 新しいReactの静的ファイル（Viteビルド成果物）へルーティング
* **`/api/new/`（新規API）**: FuelPHPに新設するAPIコントローラーへルーティング

### Nginx 設定サンプル

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/existing-fuelphp/public;
    index index.php index.html;

    # 1. 既存の別サービスやFuelPHPの通常ルーティング
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPMの設定（既存のFuelPHP用）
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/var/run/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # 2. 【新サービス】特定のパス以下をReact（静的ファイル）にルーティング
    location /new-service {
        alias /var/www/new-react-app/dist;
        index index.html;
        try_files $uri $uri/ /new-service/index.html;
    }

    # 3. 【新サービス用API】Reactから叩くFuelPHPの新しいAPIパス
    location /api/new {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

---

## 3. フロントエンド技術スタック

将来の移行に耐えうる、保守性と独立性の高いモダン構成を採用します。

| カテゴリ | 選定技術 / ライブラリ | 採用理由・役割 |
| :--- | :--- | :--- |
| **基盤・ビルド** | Vite + React | 高速な開発体験。静的ファイル出力によりバックエンド非依存でデプロイ可能。 |
| **ルーティング** | React Router | SPA内の画面遷移（顧客選択〜同意署名等）の管理。 |
| **通信・サーバー状態** | TanStack Query | APIリクエストとキャッシュ管理。APIエンドポイント抽象化の要。 |
| **クライアント状態** | Zustand | ウィザードのステップ数や一時的な入力データの保持。 |
| **フォーム・検証** | React Hook Form + Zod | レンダリングを抑えたフォーム管理と厳密なバリデーション。 |
| **スタイリング** | Tailwind CSS | ユーティリティファーストによる高速かつ一貫性のあるUI構築。 |
| **電子署名** | react-signature-canvas | 「同意署名」ステップにおける手書きサインの画像（Base64）取得。 |
| **日付操作** | Day.js | APIから取得したタイムスタンプ等の軽量な日付フォーマット処理。 |

---

## 4. 状態（State）管理戦略

データの性質に応じて役割を明確に分離し、保守性の高いコードを実現します。

**Server State（TanStack Queryが担当）**
データベースに由来するデータ（顧客一覧、同意書フォーマット、送信結果等）を管理します。キャッシュの活用により、ウィザード内で「戻る」操作を行った際の再通信を排除し、UXを向上させます。

**Client State（Zustandが担当）**
UIの一時的な状態（選択中の顧客ID、チェックボックス状態、現在のステップ数等）を管理します。誤操作によるリロード対策として、`sessionStorage`への永続化（`persist` ミドルウェア）を組み合わせます。

---

## 5. API連携と認証戦略（将来への布石）

将来的なバックエンドのLaravel完全移行（SPA向け認証機能であるSanctumの利用等）を見据え、以下の設計規則を厳守します。

**認証方式（Auth0 セッション共有型）**
既存FuelPHP環境へのJWT導入ハードルを考慮し、すでに確立しているAuth0のセッションCookieを利用します。React側はAPIリクエスト時に必ず `credentials: 'include'` を設定します。SPA向けの標準認証プロトコルは「Cookieの送信」であるため、将来Laravel（Sanctum）へ移行してもReact側の通信ロジックは変更不要で機能します。

**APIエンドポイントの抽象化**
フロントエンドのコード内にURLをハードコードしません。環境変数（`VITE_API_BASE_URL=/api/new`）を利用し、共通のAPIクライアント関数を通じて通信を行います。

**レスポンスフォーマットのLaravel標準化**
FuelPHP側で新規作成するAPIは、将来の移行ギャップを最小化するため、Laravelのリソース機能が生成する的なRESTfulなJSONフォーマット（`data` ラッパーや `errors` オブジェクト）に寄せてレスポンスを返却します。

---

## 6. テスト戦略（フロント重視の二段構え）

FuelPHP（v8.2）の環境問題による内部テスト（PHPUnit等）導入の困難さを考慮し、**バックエンドの単体テストは実施しません**。その代わり、フロントエンドにおいて「Vitest（高速ロジック検証）」と「Playwright（ブラウザ統合検証）」を組み合わせた、堅牢なテスト体制を構築します。

### 6.1 Vitest + React Testing Library (単体・ロジックテスト)
ブラウザを立ち上げずミリ秒単位で実行できるため、フロントエンド内の複雑なロジックや入力チェックの網羅的な検証を担当します。

* **Zodによるバリデーションルールの網羅検証:** 「空欄エラー」「チェックボックス未チェック時の挙動」など、全フォームの境界値テスト。
* **Zustandのストア（状態管理）テスト:** ステップを戻った際に入力データが正しく保持・破棄されているかの状態遷移検証。
* **Day.js等のユーティリティ関数テスト:** APIから受信した日時データが画面用に正しくフォーマットされるかの検証。

### 6.2 Playwright (E2E・統合テスト)
実際のブラウザをバックグラウンドで起動し、システム全体が結合して正しく動作するかをエンドツーエンドで検証します。

* **主要シナリオ（ハッピーパス）の通しテスト:** 「ログイン → 顧客選択 → 同意書選択 → サイン → 完了」というコア機能がエラーなく完結することの検証。
* **Auth0のログイン連携・リダイレクト検証:** 未ログイン状態のユーザーがアクセスした際、正しくAuth0の認証画面へ誘導されるかの検証。
* **バックエンドとの通信統合確認:** 実際のAPIと通信し、返却されたデータが壊れずに画面に描画されるかの検証。

**【将来の移行時における最大のメリット】**
バックエンドがFuelPHPからLaravelに置き換わっても、APIの仕様さえ同じであればPlaywrightのE2Eテストは1行も書き換えることなくそのままパスします。つまり、**「Playwrightのテストがオールグリーンになれば、バックエンドのリプレイスは100%成功した」**と客観的に証明できる、最強の品質防壁となります。

---

## 7. フロントエンド固有の設定

Webサーバー側で `/new-service` というベースパスを割り当てるため、ViteおよびReact Routerに以下の設定を適用します。

**`vite.config.js`**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    base: '/new-service/', // アセットの読み込みパスを統一
    build: {
        outDir: 'dist',
    }
});
```

**`App.jsx`（ルーティング定義）**
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
    return (
        <BrowserRouter basename="/new-service">
            <Routes>
                <Route path="/" element={<CustomerSelect />} />
                <Route path="/agreement-select" element={<AgreementSelect />} />
                <Route path="/agreement-check" element={<AgreementCheck />} />
                <Route path="/agreement-sign" element={<AgreementSign />} />
                <Route path="/agreement-search" element={<AgreementSearch />} />
            </Routes>
        </BrowserRouter>
    );
}
```

---

## 8. 今後の開発ロードマップ

チームの開発標準であるGitHub Flowに則り、フロントエンドとAPI側の開発を並行して堅実に進めます。

**フェーズ1: 統合環境・インフラ構築**
Vite環境の初期化、Tailwind CSS設定、Nginxのルーティング検証。

**フェーズ2: SPA基盤・共通処理の実装**
React Routerの配置、Zustandストア作成、セッション共有を前提とした共通APIクライアント（環境変数でのパス抽象化含む）の実装。

**フェーズ3: 各ステップ画面の開発**
React Hook Form + Zodによるバリデーション、`react-signature-canvas` による署名機能、TanStack QueryによるAPI繋ぎ込み、およびVitest / Playwrightによるテストコードの作成。
