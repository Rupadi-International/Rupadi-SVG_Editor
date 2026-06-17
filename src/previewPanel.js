const vscode = require('vscode');

function getNonce() {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

class SvgPreviewPanel {
  static currentPanel = undefined;
  static viewType = 'rupadiSvgPreview';

  static createOrShow(extensionUri, content = '') {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn + 1
      : vscode.ViewColumn.Two;

    if (SvgPreviewPanel.currentPanel) {
      SvgPreviewPanel.currentPanel._panel.reveal(column);
      SvgPreviewPanel.currentPanel.update(content);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SvgPreviewPanel.viewType,
      'SVG Preview',
      column,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    SvgPreviewPanel.currentPanel = new SvgPreviewPanel(panel);
    SvgPreviewPanel.currentPanel.update(content);
  }

  constructor(panel) {
    this._panel = panel;
    this._disposables = [];

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._buildHtml();

    // Refresh button in the webview asks the extension for latest content
    this._panel.webview.onDidReceiveMessage(
      msg => {
        if (msg.type === 'refresh') {
          const editor = vscode.window.activeTextEditor;
          if (editor) this.update(editor.document.getText());
        }
      },
      null,
      this._disposables
    );
  }

  update(content) {
    this._panel.webview.postMessage({ type: 'update', content });
  }

  dispose() {
    SvgPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) d.dispose();
    }
  }

  _buildHtml() {
    const nonce = getNonce();
    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data: https:;">
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>SVG Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #1e1e1e;
      color: #ccc;
      font-family: 'Segoe UI', system-ui, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── Toolbar ── */
    .toolbar {
      display: flex; align-items: center; gap: 10px;
      padding: 7px 14px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
      flex-shrink: 0;
    }
    .toolbar-title { font-size: 13px; font-weight: 600; color: #ccc; }
    .spacer { flex: 1; }

    .error-msg {
      font-size: 11px; color: #f87171;
      max-width: 320px; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }

    /* Auto toggle */
    .toggle-wrap {
      display: flex; align-items: center; gap: 6px;
      cursor: pointer; user-select: none;
    }
    .toggle-track {
      width: 34px; height: 18px; border-radius: 9px;
      position: relative; transition: background .2s;
      background: #0e7490;
    }
    .toggle-track.off { background: #4b5563; }
    .toggle-thumb {
      position: absolute; top: 2px; left: 18px;
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; transition: left .2s;
    }
    .toggle-thumb.off { left: 2px; }
    .toggle-label { font-size: 11px; color: #9ca3af; }

    /* Refresh button */
    .btn-refresh {
      background: none; border: 1px solid #4b5563; border-radius: 4px;
      color: #9ca3af; cursor: pointer; font-size: 13px;
      padding: 2px 8px; display: flex; align-items: center; gap: 4px;
      line-height: 1.5;
    }
    .btn-refresh:hover { border-color: #6b7280; color: #e5e7eb; }
    .refresh-icon { font-size: 15px; display: inline-block; }
    .refresh-icon.spin { animation: spin .4s linear; }

    /* Pending badge */
    .badge {
      font-size: 10px; background: #f59e0b; color: #1c1917;
      border-radius: 10px; padding: 1px 6px; font-weight: 700;
    }

    /* Preview area */
    .preview-area {
      flex: 1; display: flex; align-items: center; justify-content: center;
      overflow: auto; background: #fff; position: relative;
    }
    .checker {
      position: absolute; inset: 0; pointer-events: none; opacity: .06;
      background-image: repeating-conic-gradient(#aaa 0% 25%, transparent 0% 50%);
      background-size: 20px 20px;
    }
    .svg-wrap {
      position: relative; width: 90%; height: 90%;
      display: flex; align-items: center; justify-content: center;
    }
    .svg-wrap svg { max-width: 100%; max-height: 100%; display: block; }

    .empty-state {
      position: absolute;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      color: #6b7280; font-size: 13px; text-align: center; pointer-events: none;
    }
    .empty-state .icon { font-size: 40px; opacity: .25; }

    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">SVG / XML Preview</span>
    <div class="spacer"></div>
    <span class="error-msg" id="error" hidden></span>
    <span class="badge" id="pendingBadge" hidden title="Unsaved preview — click Refresh">1 pending</span>

    <div class="toggle-wrap" id="toggleWrap" title="Auto-refresh as you type">
      <div class="toggle-track" id="toggleTrack">
        <div class="toggle-thumb" id="toggleThumb"></div>
      </div>
      <span class="toggle-label">Auto</span>
    </div>

    <button class="btn-refresh" id="btnRefresh" title="Refresh preview now">
      <span class="refresh-icon" id="refreshIcon">↻</span>
      <span style="font-size:11px">Refresh</span>
    </button>
  </div>

  <div class="preview-area">
    <div class="checker"></div>
    <div class="svg-wrap" id="svgWrap">
      <div class="empty-state" id="emptyState">
        <div class="icon">⬡</div>
        <div>Open an SVG or XML file and press<br><strong>Ctrl+Shift+V</strong> (or run<br><em>Rupadi: Open SVG/XML Preview</em>)</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    let autoRefresh = true;
    let pendingContent = null;

    const svgWrap     = document.getElementById('svgWrap');
    const emptyState  = document.getElementById('emptyState');
    const errorEl     = document.getElementById('error');
    const badge       = document.getElementById('pendingBadge');
    const toggleTrack = document.getElementById('toggleTrack');
    const toggleThumb = document.getElementById('toggleThumb');
    const refreshIcon = document.getElementById('refreshIcon');

    function renderContent(content) {
      errorEl.hidden = true;
      badge.hidden   = true;

      if (!content || !content.trim()) {
        svgWrap.innerHTML = '';
        svgWrap.appendChild(emptyState);
        return;
      }

      const parser = new DOMParser();
      const doc    = parser.parseFromString(content, 'application/xml');
      const err    = doc.querySelector('parsererror');

      if (err) {
        errorEl.textContent = '✕ ' + err.textContent.trim().split('\\n')[0];
        errorEl.hidden = false;
        return;
      }

      svgWrap.innerHTML = content;
    }

    // Toggle auto-refresh
    document.getElementById('toggleWrap').addEventListener('click', () => {
      autoRefresh = !autoRefresh;
      toggleTrack.classList.toggle('off', !autoRefresh);
      toggleThumb.classList.toggle('off', !autoRefresh);

      if (autoRefresh && pendingContent !== null) {
        renderContent(pendingContent);
        pendingContent = null;
        badge.hidden = true;
      }
    });

    // Manual refresh
    document.getElementById('btnRefresh').addEventListener('click', () => {
      refreshIcon.classList.add('spin');
      setTimeout(() => refreshIcon.classList.remove('spin'), 400);

      if (pendingContent !== null) {
        renderContent(pendingContent);
        pendingContent = null;
        badge.hidden = true;
      } else {
        // Ask extension for latest editor content
        vscode.postMessage({ type: 'refresh' });
      }
    });

    // Messages from extension (new editor content)
    window.addEventListener('message', event => {
      const { type, content } = event.data;
      if (type !== 'update') return;

      if (autoRefresh) {
        renderContent(content);
      } else {
        pendingContent = content;
        badge.hidden = false;
      }
    });
  </script>
</body>
</html>`;
  }
}

module.exports = { SvgPreviewPanel };
