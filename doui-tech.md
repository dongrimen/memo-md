# 新サービス開発における技術選定およびアプリケーション構成定義書

本書は、既存のFuelPHPシステムに新サービス（同意書取得ウィザード機能）を共存・追加するための技術選定、アプリケーション構成、インフラストラクチャ設計、およびAPI認証戦略の検討結果をまとめた定義書です。

---

## 1. システム概要と要件
既存のFuelPHPで構築された関連サービスが稼働する環境に、新サービスとして「顧客選択、同意書選択、同意チェック、同意署名、同意検索」のステップを持つウィザード形式の画面をモダンなSPAとして追加します。
既存システムへの影響（デグレード）を最小限に抑えつつ、高い開発体験と保守性を両立する構成とします。

---

## 2. インフラ・ルーティング構成

既存のWebサーバー（Nginx / Apache）レイヤーでURLパスを検知し、リクエストを既存サービスと新サービス（React）に完全に振り分けます。これにより、既存のソースコードを書き換えることなく独立したデプロイを可能にします。

### 2.1 パスルーティングの方針
* **`/` などの既存パス**: 既存のFuelPHPおよび関連サービスへルーティング。
* **`/new-service/`（特定のパス）**: 新しいReactの静的ファイル（ビルド成果物）へルーティング。
* **`/api/new/`（新サービス用API）**: FuelPHPに新設するAPIコントローラーへルーティング。

### 2.2 Nginx 設定サンプル
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

## 3. フロントエンド技術スタック（`/new-service` 領域）

Vite + Reactを基盤とし、ウィザード形式の複雑な業務アプリケーションを堅牢に構築するための最適なライブラリを選定しました。

| カテゴリ | 選定技術 / ライブラリ | 採用理由・役割 |
| :--- | :--- | :--- |
| **基盤・ビルド** | Vite + React | 高速なビルド環境と、モダンなコンポーネント開発の標準基盤。 |
| **ルーティング** | React Router | `/new-service` をベースパス（basename）とするSPA内ルーティング。 |
| **サーバー状態管理** | TanStack Query | FuelPHP APIとの通信、データキャッシュ、ローディング・エラー状態の管理。 |
| **クライアント状態管理**| Zustand | ウィザードのステップ数や画面間のUI状態を保持する軽量な状態管理。 |
| **フォーム・検証** | React Hook Form + Zod | レンダリングを最小限に抑えたフォーム管理と、厳密なバリデーション。 |
| **スタイリング** | Tailwind CSS | ユーティリティファーストによる高速で一貫性のあるUIデザインの実装。 |
| **電子署名** | react-signature-canvas | 「同意署名」ステップにおける手書きサイン機能の実現（Base64形式で取得）。 |
| **日付操作** | Day.js | APIから取得したタイムスタンプや日時のフォーマット調整用の軽量ライブラリ。 |

---

## 4. 状態（State）管理戦略

データの性質に応じて役割を明確に分離し、保守性の高いコードを実現します。

1. **Server State（サーバー状態：TanStack Queryが担当）**
   * 「顧客一覧データ」「同意書フォーマット」「送信結果」など、データベースに由来するデータ。
   * キャッシュを活用することで、ウィザード内で「戻る」操作を行った際の再通信を排除し、UXを向上。
2. **Client State（クライアント状態：Zustandが担当）**
   * 「現在選択されている顧客ID」「チェックボックスのON/OFF」「現在のステップ数」など、UIの一時的な状態。
   * 誤操作によるリロード対策として、`sessionStorage`への永続化（`persist` ミドルウェア）を組み合わせて入力データの消失を防ぐ。

---

## 5. 認証連携戦略の選択肢（Auth0の活用）

既存システムで導入済みのAuth0を活用し、フロントエンド（React）とバックエンド（FuelPHP）の認証を連携させます。全社的な今後のAPI戦略（OAuth 2.0の採用方針）を踏まえ、以下の2つのアプローチから最適なものを選択します。

### アプローチA: セッション共有型（既存アーキテクチャの流用）
既存のFuelPHP側で確立しているAuth0ログインのセッション（Cookie）を、同ドメインであるReact側からもそのまま利用する手法です。

* **仕組み**: ReactからのAPIリクエスト時に `credentials: 'include'` を付与し、既存のセッションCookieを送信。FuelPHP側は既存の `Auth::check()` 等で認証を判断する。
* **メリット**: フロント・バックエンド共に実装コストが最も低く、早期リリースに最適。
* **デメリット**: ブラウザや同一ドメインに依存するため、将来的なAPIの他システム流用やネイティブアプリ対応には不向き。

### アプローチB: OAuth 2.0 JWT ベアラー認証型（推奨・次世代アーキテクチャ）
全社の今後のAPI標準化方針に合わせ、新サービス用APIをOAuth 2.0のリソースサーバーとして構築し、JWT（アクセストークン）で通信する手法です。

* **仕組み**: React側に `@auth0/auth0-react` を導入してJWTを取得。APIリクエストのヘッダーに `Authorization: Bearer <token>` を付与する。FuelPHP側はAuth0のJWKS（公開鍵）を用いてトークンを検証する。
* **メリット**: 
  * **標準化**: 今後の外部公開・社内標準API（OAuth 2.0）とアーキテクチャを完全に統一できる。
  * **スケーラビリティ**: ステートレス通信となり、サーバー側でのセッション管理が不要になる。
  * **拡張性**: 将来的に別ドメインへの分離や、モバイルアプリ・他システムからのAPI利用が容易になる。
* **デメリット**: React側でのトークンリフレッシュ管理や、FuelPHP側でのJWT検証機能の新規実装など、初期の開発工数が増加する。

**【方針の決定】**
リリーススピードを最優先する場合は「アプローチA」を採用しますが、今後のAPI戦略への準拠と中長期的なシステムの拡張性を重視する場合は「アプローチB」の採用を強く推奨します。

---

## 6. フロントエンド（Vite）固有の設定

Webサーバー側で `/new-service` というベースパスを割り当てるため、ViteおよびReact Routerに以下の設定を適用します。

### 6.1 `vite.config.js`
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

### 6.2 `App.jsx`（ルーティング定義）
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

## 7. 今後の開発ロードマップ
1. **フェーズ1: 統合環境・インフラ構築** (Vite環境の初期化、Tailwind CSS設定、Webサーバーのルーティング検証)
2. **フェーズ2: SPA基盤・共通処理の実装** (React Routerの配置、Zustandストア作成、選択した認証戦略に基づく共通APIクライアントの実装)
3. **フェーズ3: 各ステップ画面の開発** (React Hook Form + Zodによるバリデーション、`react-signature-canvas` による署名機能、TanStack QueryによるAPI繋ぎ込み)
