// 脆弱性研究用アプリケーション - メインJavaScript
// 注意: このコードには意図的にセキュリティ脆弱性が含まれています

// グローバル変数（情報漏洩の脆弱性）
let currentUser = null;
let users = [
    { id: 1, username: 'admin', password: 'password', email: 'admin@vulnsocial.com', bio: '管理者アカウント', role: 'admin' },
    { id: 2, username: 'user', password: '123456', email: 'user@vulnsocial.com', bio: '一般ユーザー', role: 'user' },
    { id: 3, username: 'alice', password: 'alice123', email: 'alice@vulnsocial.com', bio: 'アリスです', role: 'user' },
    { id: 4, username: 'bob', password: 'bob456', email: 'bob@vulnsocial.com', bio: 'ボブです', role: 'user' },
    { id: 5, username: 'charlie', password: 'charlie789', email: 'charlie@vulnsocial.com', bio: 'チャーリーです', role: 'user' }
];

let posts = [
    { id: 1, userId: 2, username: 'user', content: 'こんにちは！初投稿です。', timestamp: new Date('2024-01-01T10:00:00') },
    { id: 2, userId: 3, username: 'alice', content: 'いい天気ですね！', timestamp: new Date('2024-01-01T11:00:00') },
    { id: 3, userId: 4, username: 'bob', content: 'プログラミング楽しい！', timestamp: new Date('2024-01-01T12:00:00') }
];

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    // ログインフォームのイベントリスナー
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // 設定フォームのイベントリスナー
    document.getElementById('settings-form').addEventListener('submit', handleSettingsUpdate);
    
    // 初期投稿を表示
    displayPosts();
    
    // URLパラメータをチェック（XSS脆弱性）
    checkUrlParameters();
});

// URLパラメータのチェック（反射型XSS脆弱性）
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        // 危険: ユーザー入力を直接HTMLに挿入（XSS脆弱性）
        document.body.innerHTML += '<div class="warning">メッセージ: ' + message + '</div>';
    }
}

// ログイン処理（弱い認証）
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // 危険: 平文パスワード比較、SQLインジェクション風の脆弱性シミュレーション
    const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
    console.log('実行されるクエリ（シミュレーション）:', query);
    
    // SQLインジェクション風の処理（実際のSQLではないが、概念を示す）
    if (username.includes("' OR '1'='1") || password.includes("' OR '1'='1")) {
        // SQLインジェクション成功のシミュレーション
        currentUser = users[0]; // 管理者として認証
        showMessage('SQLインジェクションが成功しました！管理者としてログインします。', 'warning');
    } else {
        // 通常の認証
        currentUser = users.find(user => user.username === username && user.password === password);
    }
    
    if (currentUser) {
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('hidden');
        document.getElementById('welcome-message').textContent = `ようこそ、${currentUser.username}さん！`;
        
        // 管理者の場合は管理者パネルを表示
        if (currentUser.role === 'admin') {
            document.getElementById('admin-panel').classList.remove('hidden');
        }
        
        showDashboard();
    } else {
        showMessage('ログインに失敗しました。', 'warning');
    }
}

// ログアウト
function logout() {
    currentUser = null;
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
    
    // フォームをリセット
    document.getElementById('login-form').reset();
}

// 画面切り替え
function showDashboard() {
    hideAllContentAreas();
    document.getElementById('dashboard').classList.remove('hidden');
    displayPosts();
}

function showProfile() {
    hideAllContentAreas();
    document.getElementById('profile').classList.remove('hidden');
    displayCurrentUserProfile();
}

function showSettings() {
    hideAllContentAreas();
    document.getElementById('settings').classList.remove('hidden');
    loadUserSettings();
}

function hideAllContentAreas() {
    const areas = document.querySelectorAll('.content-area');
    areas.forEach(area => area.classList.add('hidden'));
}

// 投稿作成（格納型XSS脆弱性）
function createPost() {
    if (!currentUser) return;
    
    const content = document.getElementById('post-content').value;
    if (!content.trim()) {
        showMessage('投稿内容を入力してください。', 'warning');
        return;
    }
    
    const newPost = {
        id: posts.length + 1,
        userId: currentUser.id,
        username: currentUser.username,
        content: content, // 危険: サニタイズしていない（格納型XSS脆弱性）
        timestamp: new Date()
    };
    
    posts.unshift(newPost);
    document.getElementById('post-content').value = '';
    displayPosts();
    showMessage('投稿が作成されました！', 'success');
}

// 投稿表示（XSS脆弱性）
function displayPosts() {
    const postsContainer = document.getElementById('posts-list');
    postsContainer.innerHTML = '';
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        
        // 危険: ユーザー入力を直接HTMLに挿入（XSS脆弱性）
        postElement.innerHTML = `
            <div class="post-header">${post.username}</div>
            <div class="post-content">${post.content}</div>
            <div class="post-time">${post.timestamp.toLocaleString()}</div>
        `;
        
        postsContainer.appendChild(postElement);
    });
}

// ユーザー検索（インジェクション脆弱性）
function searchUsers() {
    const searchTerm = document.getElementById('search-input').value;
    const resultsContainer = document.getElementById('search-results');
    
    if (!searchTerm.trim()) {
        resultsContainer.innerHTML = '<p>検索キーワードを入力してください。</p>';
        return;
    }
    
    // 危険: 動的なJavaScriptコード実行（コードインジェクション脆弱性）
    try {
        // この実装は非常に危険です - 実際のアプリケーションでは絶対に使用しないでください
        const searchFunction = new Function('users', 'searchTerm', `
            return users.filter(user => {
                return user.username.toLowerCase().includes('${searchTerm.toLowerCase()}') ||
                       user.bio.toLowerCase().includes('${searchTerm.toLowerCase()}');
            });
        `);
        
        const results = searchFunction(users, searchTerm);
        displaySearchResults(results);
    } catch (error) {
        resultsContainer.innerHTML = '<p class="warning">検索エラーが発生しました: ' + error.message + '</p>';
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p>該当するユーザーが見つかりませんでした。</p>';
        return;
    }
    
    let html = '<h4>検索結果:</h4>';
    results.forEach(user => {
        html += `
            <div class="profile-info">
                <strong>${user.username}</strong><br>
                <em>${user.bio}</em><br>
                <small>ID: ${user.id}</small>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
}

// プロフィール表示
function displayCurrentUserProfile() {
    if (!currentUser) return;
    
    const profileContainer = document.getElementById('profile-content');
    profileContainer.innerHTML = `
        <div class="profile-info">
            <h3>${currentUser.username}のプロフィール</h3>
            <p><strong>ID:</strong> ${currentUser.id}</p>
            <p><strong>メールアドレス:</strong> ${currentUser.email}</p>
            <p><strong>自己紹介:</strong> ${currentUser.bio}</p>
            <p><strong>権限:</strong> ${currentUser.role}</p>
        </div>
    `;
}

// 他のユーザーのプロフィール表示（IDOR脆弱性）
function viewUserProfile() {
    const userId = parseInt(document.getElementById('user-id').value);
    const otherProfileContainer = document.getElementById('other-profile');
    
    if (!userId || userId < 1 || userId > 5) {
        otherProfileContainer.innerHTML = '<p class="warning">有効なユーザーIDを入力してください（1-5）。</p>';
        return;
    }
    
    // 危険: 認可チェックなし（IDOR脆弱性）
    const user = users.find(u => u.id === userId);
    
    if (user) {
        // 危険: 他のユーザーの機密情報も表示
        otherProfileContainer.innerHTML = `
            <div class="profile-info">
                <h4>${user.username}のプロフィール</h4>
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>メールアドレス:</strong> ${user.email}</p>
                <p><strong>自己紹介:</strong> ${user.bio}</p>
                <p><strong>権限:</strong> ${user.role}</p>
                <p><strong>パスワード:</strong> ${user.password}</p>
                <p class="warning">注意: 本来は他のユーザーのパスワードは表示されるべきではありません（IDOR脆弱性）</p>
            </div>
        `;
    } else {
        otherProfileContainer.innerHTML = '<p class="warning">ユーザーが見つかりませんでした。</p>';
    }
}

// 設定の読み込み
function loadUserSettings() {
    if (!currentUser) return;
    
    document.getElementById('email').value = currentUser.email;
    document.getElementById('bio').value = currentUser.bio;
}

// 設定の更新（CSRF脆弱性）
function handleSettingsUpdate(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    const email = document.getElementById('email').value;
    const bio = document.getElementById('bio').value;
    
    // 危険: CSRFトークンなし（CSRF脆弱性）
    currentUser.email = email;
    currentUser.bio = bio;
    
    // usersリストも更新
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex].email = email;
        users[userIndex].bio = bio;
    }
    
    showMessage('設定が更新されました！', 'success');
}

// 管理者機能
function viewAllUsers() {
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('管理者権限が必要です。', 'warning');
        return;
    }
    
    const adminContent = document.getElementById('admin-content');
    let html = '<h3>全ユーザー情報</h3>';
    
    users.forEach(user => {
        html += `
            <div class="profile-info">
                <strong>ID:</strong> ${user.id}<br>
                <strong>ユーザー名:</strong> ${user.username}<br>
                <strong>パスワード:</strong> ${user.password}<br>
                <strong>メール:</strong> ${user.email}<br>
                <strong>権限:</strong> ${user.role}<br>
                <strong>自己紹介:</strong> ${user.bio}
            </div>
        `;
    });
    
    adminContent.innerHTML = html;
}

function deleteUser() {
    if (!currentUser || currentUser.role !== 'admin') {
        showMessage('管理者権限が必要です。', 'warning');
        return;
    }
    
    const userId = prompt('削除するユーザーのIDを入力してください:');
    if (!userId) return;
    
    const userIndex = users.findIndex(u => u.id === parseInt(userId));
    if (userIndex !== -1 && users[userIndex].id !== currentUser.id) {
        users.splice(userIndex, 1);
        showMessage(`ユーザーID ${userId} を削除しました。`, 'success');
        viewAllUsers(); // リストを更新
    } else {
        showMessage('ユーザーが見つからないか、自分自身は削除できません。', 'warning');
    }
}

// メッセージ表示
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}

// デバッグ用（本番環境では削除すべき）
window.debugInfo = {
    currentUser: () => currentUser,
    allUsers: () => users,
    allPosts: () => posts,
    setAdmin: () => {
        if (currentUser) {
            currentUser.role = 'admin';
            document.getElementById('admin-panel').classList.remove('hidden');
            showMessage('管理者権限を付与しました（デバッグ機能）', 'warning');
        }
    }
};

console.log('デバッグ情報: window.debugInfo でアクセス可能');
console.log('例: window.debugInfo.currentUser() - 現在のユーザー情報');
console.log('例: window.debugInfo.setAdmin() - 管理者権限を付与');