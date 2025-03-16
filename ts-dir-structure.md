# Laravel + TypeScript のディレクトリ構成と実装方法

## **ディレクトリ構成**
```
/resources
 ├── /ts
 │   ├── /interfaces    # 型定義 (API レスポンスや DTO など)
 │   ├── /services      # API クライアントやビジネスロジック
 │   ├── /utils         # 汎用的な関数
 │   ├── /pages         # 各ページ固有のスクリプト (フォームバリデーションや動的処理)
 │   ├── bootstrap.ts   # 初期化処理 (Axios 設定など)
 │   ├── app.ts         # メインエントリーポイント
 │   ├── vite-env.d.ts  # Vite 環境変数の型定義
 ├── /css               # スタイル関連 (SCSS など)
 ├── /views             # Blade テンプレート
```

---

## **1. `/resources/ts/interfaces/`（型定義）**

### **`/resources/ts/interfaces/User.ts`**
```ts
export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
}
```

### **`/resources/ts/interfaces/ApiResponse.ts`**
```ts
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
```

---

## **2. `/resources/ts/services/`（API クライアントやビジネスロジック）**

### **`/resources/ts/services/userService.ts`**
```ts
import axios from 'axios';
import { User } from '@/interfaces/User';
import { ApiResponse } from '@/interfaces/ApiResponse';

export async function fetchUsers(): Promise<User[]> {
    const response = await axios.get<ApiResponse<User[]>>('/api/users');
    return response.data.data;
}

export async function fetchUser(id: number): Promise<User> {
    const response = await axios.get<ApiResponse<User>>(`/api/users/${id}`);
    return response.data.data;
}
```

---

## **3. `/resources/ts/utils/`（汎用的な関数）**

### **`/resources/ts/utils/format.ts`**
```ts
export function formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
}
```

### **`/resources/ts/utils/dom.ts`**
```ts
export function getElement<T extends HTMLElement>(selector: string): T | null {
    return document.querySelector(selector);
}
```

---

## **4. `/resources/ts/bootstrap.ts`（初期化処理）**
```ts
import axios from 'axios';

// Axios のデフォルト設定
axios.defaults.baseURL = '/api';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

console.log('Bootstrap loaded');
```

---

## **5. `/resources/ts/app.ts`（メインエントリーポイント）**
```ts
import './bootstrap';

console.log('Main app script loaded');
```

---

## **6. `/resources/ts/pages/`（各ページ固有のスクリプト）**

### **`/resources/ts/pages/home.ts`**
```ts
import { fetchUsers } from '@/services/userService';
import { formatDate } from '@/utils/format';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Home page script loaded');

    const users = await fetchUsers();
    users.forEach(user => {
        console.log(`${user.name} - Created at: ${formatDate(user.created_at)}`);
    });
});
```

### **`/resources/ts/pages/profile.ts`**
```ts
import { fetchUser } from '@/services/userService';
import { getElement } from '@/utils/dom';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Profile page script loaded');

    const userId = 1; // 仮のユーザーID
    const user = await fetchUser(userId);

    const nameElement = getElement<HTMLSpanElement>('#user-name');
    if (nameElement) {
        nameElement.textContent = user.name;
    }
});
```

---

## **7. `vite.config.ts`（Vite の設定）**
```ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/ts/app.ts',
                'resources/ts/pages/home.ts',
                'resources/ts/pages/profile.ts',
            ],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/ts',
        },
    },
});
```

---

## **8. Blade テンプレートで TypeScript を読み込む**

### **`home.blade.php`**
```blade
<head>
    @vite(['resources/ts/pages/home.ts'])
</head>
<body>
    <h1>Home Page</h1>
</body>
```

### **`profile.blade.php`**
```blade
<head>
    @vite(['resources/ts/pages/profile.ts'])
</head>
<body>
    <h1>Profile Page</h1>
    <span id="user-name"></span>
</body>
```

---

## **ポイントまとめ**
✅ **共通の型定義 (`/interfaces/`) を作成し、サービスや API レスポンスで活用**  
✅ **`/services/` で API クライアントを管理し、`import` して利用**  
✅ **`/utils/` に汎用的な関数をまとめ、コードの再利用性を向上**  
✅ **`bootstrap.ts` でグローバルな初期化処理を定義**  
✅ **`pages/` に各ページごとのスクリプトを作成し、Blade で必要なものだけ読み込む**  

この方法なら、不要な TypeScript ファイルをロードせず、効率的な開発が可能

