// ==UserScript==
// @name         VOS 床邊故事睡眠播放器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自動連播 VOS 床邊故事，跳過片頭片尾，倒數結束後自動停止並允許手機黑屏
// @author       You
// @match        *://vos.org.tw/*
// @match        *://*.vos.org.tw/*
// @match        *://www.vos.org.tw/*
// @include      *vos.org.tw*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ========== 載入 NoSleep ==========
    function loadNoSleep(callback) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nosleep/0.12.0/NoSleep.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    // ========== 主程式 ==========
    function main() {
        console.log('[VOS Sleep] 主程式開始執行');

        // ========== 狀態變數 ==========
        let noSleep = typeof NoSleep !== 'undefined' ? new NoSleep() : null;
        let countdownSecs = 40 * 60;
        let timerId = null;
        let isRunning = false;
        let skipCheckEnabled = false;

        // ========== 建立控制面板 UI ==========
        function createPanel() {
            // 移除舊面板（如果存在）
            const oldPanel = document.getElementById('vos-sleep-panel');
            if (oldPanel) oldPanel.remove();

            const panel = document.createElement('div');
            panel.id = 'vos-sleep-panel';
            panel.innerHTML = `
                <div class="vos-header">
                    <span class="vos-title">🌙 VOS 睡眠播放器</span>
                    <button class="vos-minimize" id="vosMinimize">─</button>
                </div>
                <div class="vos-content">
                    <div class="vos-timer-box">
                        <div class="vos-timer-label">倒數計時</div>
                        <div class="vos-timer" id="vosTimer">40:00</div>
                        <div class="vos-status" id="vosStatus">等待開始...</div>
                    </div>
                    <div class="vos-settings">
                        <div class="vos-setting-group">
                            <label>跳過片頭 (秒)</label>
                            <input type="number" id="vosSkipStart" value="90">
                        </div>
                        <div class="vos-setting-group">
                            <label>跳過片尾 (秒)</label>
                            <input type="number" id="vosSkipEnd" value="50">
                        </div>
                        <div class="vos-setting-group">
                            <label>計時 (分鐘)</label>
                            <input type="number" id="vosDuration" value="40">
                        </div>
                        <div class="vos-setting-group">
                            <label>當前進度</label>
                            <div id="vosProgress" class="vos-progress">--:-- / --:--</div>
                        </div>
                    </div>
                    <button class="vos-btn vos-btn-start" id="vosStartBtn">🎵 開始自動連播</button>
                    <div class="vos-hint">
                        自動跳過片頭片尾並連播下一集<br>
                        計時結束後自動停止，手機將黑屏休眠
                    </div>
                </div>
            `;

            // 添加樣式
            const style = document.createElement('style');
            style.textContent = `
                #vos-sleep-panel {
                    position: fixed !important;
                    bottom: 20px !important;
                    right: 20px !important;
                    width: 280px !important;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%) !important;
                    border: 2px solid #fb923c !important;
                    border-radius: 16px !important;
                    padding: 16px !important;
                    z-index: 2147483647 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8) !important;
                    color: white !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                #vos-sleep-panel * {
                    box-sizing: border-box !important;
                }
                #vos-sleep-panel .vos-header {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    margin-bottom: 12px !important;
                }
                #vos-sleep-panel .vos-title {
                    font-size: 16px !important;
                    font-weight: bold !important;
                    color: #fb923c !important;
                }
                #vos-sleep-panel .vos-minimize {
                    background: #334155 !important;
                    border: none !important;
                    color: #94a3b8 !important;
                    width: 24px !important;
                    height: 24px !important;
                    border-radius: 6px !important;
                    cursor: pointer !important;
                    font-size: 14px !important;
                }
                #vos-sleep-panel .vos-timer-box {
                    background: #0f172a !important;
                    border: 1px solid #334155 !important;
                    border-radius: 12px !important;
                    padding: 12px !important;
                    text-align: center !important;
                    margin-bottom: 12px !important;
                }
                #vos-sleep-panel .vos-timer-label {
                    font-size: 11px !important;
                    color: #64748b !important;
                    margin-bottom: 4px !important;
                }
                #vos-sleep-panel .vos-timer {
                    font-size: 36px !important;
                    font-weight: bold !important;
                    font-family: "SF Mono", Monaco, monospace !important;
                    color: #fb923c !important;
                }
                #vos-sleep-panel .vos-status {
                    font-size: 11px !important;
                    color: #64748b !important;
                    margin-top: 6px !important;
                }
                #vos-sleep-panel .vos-settings {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 10px !important;
                    margin-bottom: 12px !important;
                }
                #vos-sleep-panel .vos-setting-group label {
                    display: block !important;
                    font-size: 11px !important;
                    color: #94a3b8 !important;
                    margin-bottom: 4px !important;
                }
                #vos-sleep-panel .vos-setting-group input {
                    width: 100% !important;
                    background: #1e293b !important;
                    border: 1px solid #334155 !important;
                    border-radius: 8px !important;
                    padding: 8px !important;
                    color: white !important;
                    font-size: 14px !important;
                    text-align: center !important;
                }
                #vos-sleep-panel .vos-progress {
                    padding: 8px !important;
                    background: #1e293b !important;
                    border-radius: 8px !important;
                    text-align: center !important;
                    font-size: 12px !important;
                    color: #94a3b8 !important;
                }
                #vos-sleep-panel .vos-btn {
                    width: 100% !important;
                    padding: 14px !important;
                    border: none !important;
                    border-radius: 12px !important;
                    font-size: 14px !important;
                    font-weight: bold !important;
                    cursor: pointer !important;
                    transition: all 0.2s !important;
                }
                #vos-sleep-panel .vos-btn-start {
                    background: linear-gradient(135deg, #fb923c 0%, #f97316 100%) !important;
                    color: #1e293b !important;
                }
                #vos-sleep-panel .vos-btn-stop {
                    background: #334155 !important;
                    color: #94a3b8 !important;
                }
                #vos-sleep-panel .vos-hint {
                    font-size: 10px !important;
                    color: #64748b !important;
                    text-align: center !important;
                    margin-top: 10px !important;
                    line-height: 1.5 !important;
                }
                #vos-sleep-panel.minimized .vos-content {
                    display: none !important;
                }
                #vos-sleep-panel.minimized {
                    width: auto !important;
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(panel);

            // 綁定事件
            document.getElementById('vosMinimize').addEventListener('click', toggleMinimize);
            document.getElementById('vosStartBtn').addEventListener('click', togglePlayer);

            console.log('[VOS Sleep] 控制面板已建立');
            alert('[VOS Sleep] 控制面板已載入！請查看右下角。');
        }

        // ========== 最小化切換 ==========
        function toggleMinimize() {
            const panel = document.getElementById('vos-sleep-panel');
            const btn = document.getElementById('vosMinimize');
            panel.classList.toggle('minimized');
            btn.textContent = panel.classList.contains('minimized') ? '□' : '─';
        }

        // ========== 尋找音訊元素 ==========
        function findAudio() {
            return document.querySelector('audio') ||
                   document.querySelector('video') ||
                   document.getElementById('audio') ||
                   document.getElementById('player');
        }

        // ========== 尋找下一集按鈕 ==========
        function findNextButton() {
            const selectors = [
                'button.ap-next-btn',
                '.ap-next-btn',
                'button.ap-controls.ap-next-btn',
                '[class*="next-btn"]',
                '[class*="next"]',
                'img[src*="next"]',
                'button[title*="下一"]'
            ];

            for (const selector of selectors) {
                const btn = document.querySelector(selector);
                if (btn) {
                    console.log('[VOS Sleep] 找到下一集按鈕:', selector);
                    return btn;
                }
            }
            console.log('[VOS Sleep] 找不到下一集按鈕');
            return null;
        }

        // ========== 播放下一集 ==========
        function playNext() {
            const status = document.getElementById('vosStatus');
            const nextBtn = findNextButton();

            if (nextBtn) {
                console.log('[VOS Sleep] 點擊下一集按鈕');
                nextBtn.click();
                status.textContent = '⏭️ 自動切換至下一集...';
                status.style.color = '#4ade80';

                skipCheckEnabled = false;
                setTimeout(() => { skipCheckEnabled = true; }, 2000);
            } else {
                status.textContent = '⚠️ 找不到下一集按鈕';
                status.style.color = '#fbbf24';
            }
        }

        // ========== 初始化自動播放器 ==========
        function initAutoPlayer() {
            const audio = findAudio();
            const status = document.getElementById('vosStatus');
            const progress = document.getElementById('vosProgress');

            if (!audio) {
                status.textContent = '❌ 偵測不到播放器';
                status.style.color = '#f87171';
                return false;
            }

            console.log('[VOS Sleep] 找到音訊元素:', audio.tagName);
            status.textContent = '✅ 已連接播放器';
            status.style.color = '#4ade80';

            skipCheckEnabled = false;
            setTimeout(() => { skipCheckEnabled = true; }, 2000);

            audio.ontimeupdate = () => {
                if (!isRunning || !skipCheckEnabled) return;

                const skipStartVal = parseInt(document.getElementById('vosSkipStart').value);
                const skipStart = isNaN(skipStartVal) ? 90 : skipStartVal;
                const skipEndVal = parseInt(document.getElementById('vosSkipEnd').value);
                const skipEnd = isNaN(skipEndVal) ? 50 : skipEndVal;
                const currentTime = audio.currentTime;
                const duration = audio.duration;

                if (duration > 0) {
                    const formatTime = (t) => {
                        const m = Math.floor(t / 60);
                        const s = Math.floor(t % 60);
                        return `${m}:${s.toString().padStart(2, '0')}`;
                    };
                    progress.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
                }

                if (currentTime < skipStart && currentTime > 0) {
                    console.log('[VOS Sleep] 跳過片頭');
                    audio.currentTime = skipStart;
                    status.textContent = '⏩ 已跳過片頭';
                    status.style.color = '#60a5fa';
                }

                const remain = duration - currentTime;
                if (remain <= skipEnd && duration > 0 && remain > 0) {
                    console.log('[VOS Sleep] 準備下一集');
                    status.textContent = '⏭️ 準備切換下一集...';
                    playNext();
                }
            };

            audio.onplay = () => {
                if (isRunning) {
                    status.textContent = '▶️ 正在播放中...';
                    status.style.color = '#4ade80';
                }
            };

            audio.onpause = () => {
                if (isRunning) {
                    status.textContent = '⏸️ 已暫停';
                    status.style.color = '#fbbf24';
                }
            };

            audio.onended = () => {
                if (isRunning) {
                    playNext();
                }
            };

            return true;
        }

        // ========== 開始/停止切換 ==========
        function togglePlayer() {
            const btn = document.getElementById('vosStartBtn');
            const status = document.getElementById('vosStatus');

            if (isRunning) {
                stopEverything();
                return;
            }

            if (!initAutoPlayer()) return;

            isRunning = true;

            // 啟動時立即套用跳過片頭設定
            const audio = findAudio();
            if (audio) {
                const skipStartVal = parseInt(document.getElementById('vosSkipStart').value);
                const skipStart = isNaN(skipStartVal) ? 90 : skipStartVal;
                if (skipStart > 0 && audio.currentTime < skipStart) {
                    audio.currentTime = skipStart;
                    console.log('[VOS Sleep] 啟動時跳過片頭至', skipStart, '秒');
                }
            }

            if (noSleep) {
                noSleep.enable();
                console.log('[VOS Sleep] NoSleep 已啟用');
            }

            const duration = parseInt(document.getElementById('vosDuration').value) || 40;
            countdownSecs = duration * 60;
            updateTimerDisplay();

            timerId = setInterval(() => {
                countdownSecs--;
                updateTimerDisplay();
                if (countdownSecs <= 0) stopEverything();
            }, 1000);

            btn.textContent = '⏹️ 停止並重置';
            btn.className = 'vos-btn vos-btn-stop';
            status.textContent = '▶️ 自動連播已啟動';
            status.style.color = '#4ade80';
        }

        // ========== 更新計時顯示 ==========
        function updateTimerDisplay() {
            const timer = document.getElementById('vosTimer');
            const m = Math.floor(countdownSecs / 60);
            const s = countdownSecs % 60;
            timer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
            timer.style.color = countdownSecs <= 300 ? '#f87171' : '#fb923c';
        }

        // ========== 停止一切 ==========
        function stopEverything() {
            console.log('[VOS Sleep] 停止播放');

            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }

            const audio = findAudio();
            if (audio) audio.pause();

            if (noSleep) {
                noSleep.disable();
                console.log('[VOS Sleep] NoSleep 已停用');
            }

            isRunning = false;
            const btn = document.getElementById('vosStartBtn');
            const status = document.getElementById('vosStatus');

            btn.textContent = '🎵 開始自動連播';
            btn.className = 'vos-btn vos-btn-start';
            status.textContent = '⏹️ 已停止，手機將自動黑屏休眠';
            status.style.color = '#94a3b8';

            const duration = parseInt(document.getElementById('vosDuration').value) || 40;
            countdownSecs = duration * 60;
            updateTimerDisplay();
        }

        // 建立面板
        createPanel();
    }

    // ========== 初始化 ==========
    console.log('[VOS Sleep] 腳本開始載入...');
    console.log('[VOS Sleep] 當前網址:', window.location.href);

    // 多重載入策略（確保只執行一次）
    let initialized = false;
    function tryInit() {
        if (initialized) return;
        if (!document.body) return;
        initialized = true;
        console.log('[VOS Sleep] 嘗試初始化...');
        loadNoSleep(function() {
            console.log('[VOS Sleep] NoSleep 已載入');
            main();
        });
    }

    // 立即執行
    if (document.body) {
        tryInit();
    } else {
        // 等待 DOM
        document.addEventListener('DOMContentLoaded', tryInit);
    }

    // 備用：延遲執行
    setTimeout(tryInit, 1000);
    setTimeout(tryInit, 3000);

})();
