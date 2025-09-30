// --- 共通ユーティリティ関数 ---

// 数値をカンマ区切りで整形する関数
window.formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    // 小数点以下を丸める（ここでは四捨五入）
    const rounded = Math.round(num);
    return rounded.toLocaleString();
};

// 月数から 年 / 月 の文字列を生成
window.formatMonthToYearMonth = (totalMonths) => {
    if (totalMonths === null || totalMonths === undefined) return '---';
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    return `${year}年${month}月`;
};


// アプリケーション全体のデータを保持するオブジェクト
// 初期値を設定しておくことで、入力がない場合でもエラーを防ぎます。
const appData = {
    config: {
        period: 20,
        times: 100,
        birthDate: '2000-01-01',
        cash: 0,
	inflationRate: 2.0 // インフレ率（%）。デフォルト2.0%
    },
    stocks: [],
    soukan: [],
    tuika: [],
    lifeCost: [],
    bigExpense: [],
    income: [],
    tax: []
};

// 【追加 1/2】: appDataをグローバルスコープに公開
window.appData = appData;

// --- 【★修正箇所: ここからデータロード処理をDOMContentLoadedの外に出します★】 ---
// app.jsがロードされた瞬間にlocalStorageから設定データを読み込み、appDataを更新する
const storedData = localStorage.getItem('fireSimulatorData');
if (storedData) {
    try {
        const loadedData = JSON.parse(storedData);
        Object.keys(loadedData).forEach(key => {
            // 既存のappDataのキーを更新
            appData[key] = loadedData[key];
        });
        // 注意: appDataは参照渡しのため、window.appData = appData; を再実行する必要はありません。
    } catch (e) {
        console.error("Local Storageデータの解析に失敗しました。", e);
        // ロードに失敗した場合はデフォルト値のまま処理を続行します。
    }
}
// --- 【★修正箇所: ここまでデータロード処理をDOMContentLoadedの外に出しました★】 ---


// --- データ保存・読み込み機能 ---

// 【修正箇所: DOMContentLoadedで囲むことで、要素が存在しないエラーを回避】
document.addEventListener('DOMContentLoaded', () => {
    // ページによってはこれらのボタンが存在しないため、存在チェックも追加
    const saveButton = document.getElementById('saveButton');
    const loadButton = document.getElementById('loadButton');

    if (saveButton) {
        saveButton.addEventListener('click', () => {
            // appDataオブジェクトをJSON文字列に変換してlocalStorageに保存
            try {
                localStorage.setItem('fireSimulatorData', JSON.stringify(appData));
                alert('設定が保存されました！');
            } catch (e) {
                alert('設定の保存に失敗しました。');
            }
        });
    }

    if (loadButton) {
        loadButton.addEventListener('click', () => {
            // localStorageからデータを読み込み、appDataを上書き
            try {
                const storedData = localStorage.getItem('fireSimulatorData');
                if (storedData) {
                    const loadedData = JSON.parse(storedData);
                    // 既存のappDataのキーを更新
                    Object.keys(loadedData).forEach(key => {
                        appData[key] = loadedData[key];
                    });
                    alert('設定が読み込まれました！');
                    // ページが設定画面の場合は、データを画面に反映させる関数を呼び出す必要があります
                    if (window.loadConfig) window.loadConfig();
                    if (window.loadStocks) window.loadStocks();
                    // ... 他の設定画面のロード関数
                } else {
                    alert('保存された設定が見つかりませんでした。');
                }
            } catch (e) {
                alert('設定の読み込みに失敗しました。');
            }
        });
    }

    // ★★★ 修正箇所: ここにあったlocalStorageからのデータ読み込みロジックは、DOMContentLoadedの外に移動したため削除します。 ★★★

});


/**
 * Local Storageに保存されている全設定をJSON形式で整形し、ファイルとしてダウンロードさせる
 * @param {string} filename - ダウンロードするファイル名
 */
function downloadAllSettings(filename = 'FIRE_Settings_Export.json') {
    // 1. Local Storageから全設定データを取得
    const appDataString = localStorage.getItem('fireSimulatorData');
    
    if (!appDataString) {
        alert('保存された設定データが見つかりません。まず各設定を保存してください。');
        return;
    }

    // 2. データ収集に適した形に整形（匿名化はユーザー側で確認できないため、ここでは生のJSONを整形）
    // JSON文字列をパースして、整形（インデント）して文字列に戻す
    const appData = JSON.parse(appDataString);
    const formattedData = JSON.stringify(appData, null, 2); // null, 2 でインデントを適用

    // 3. ダウンロード用のBlob（バイナリラージオブジェクト）を作成
    const blob = new Blob([formattedData], { type: 'application/json;charset=utf-8' });

    // 4. ダウンロードリンクを作成し、クリックイベントを発生させる
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // DOMに追加して即座にクリックし、ダウンロードを実行
    document.body.appendChild(a);
    a.click();
    
    // 後処理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('設定ファイル（' + filename + '）をダウンロードしました。');
}

/**
 * ユーザーが選択したJSONファイル（設定ファイル）を読み込み、
 * Local Storageに反映させる
 */
function loadAllSettings() {
    // 隠しファイル選択インプットを作成
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json'; // JSONファイルのみを受け付ける

    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const newAppData = JSON.parse(content);
                
                // 必須チェック: FIREシミュレータのデータ構造か確認（最低限configがあるか）
                if (!newAppData || typeof newAppData !== 'object' || !newAppData.config) {
                    alert('エラー: ファイルの内容が正しくありません。FIREシミュレータの設定ファイルであることを確認してください。');
                    return;
                }

                // Local Storageに上書き保存
                localStorage.setItem('fireSimulatorData', JSON.stringify(newAppData));
                
                alert('設定ファイルを読み込み、Local Storageに保存しました！\n各設定画面で内容をご確認ください。');
                
                // 読み込み後、メイン画面をリロードして反映
                window.location.reload(); 

            } catch (error) {
                alert('ファイルの解析に失敗しました。ファイルが破損しているか、JSON形式ではありません。');
                console.error('File load error:', error);
            }
        };
        // ファイルをテキスト（文字列）として読み込む
        reader.readAsText(file);
    };

    // ファイル選択ダイアログを起動
    fileInput.click();
}

// グローバルスコープ（app.jsなど）で利用可能にする
window.downloadAllSettings = downloadAllSettings;
// loadAllSettingsもグローバルスコープで利用可能です