const vscode = require('vscode');
const { SvgPreviewPanel } = require('./previewPanel');

let debounceTimer;

function activate(context) {
  // Open preview command
  context.subscriptions.push(
    vscode.commands.registerCommand('rupadiSvgEditor.openPreview', () => {
      const editor = vscode.window.activeTextEditor;
      SvgPreviewPanel.createOrShow(context.extensionUri, editor?.document.getText() ?? '');
    })
  );

  // Auto-refresh: debounce 500ms after each keystroke
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (!SvgPreviewPanel.currentPanel) return;
      const active = vscode.window.activeTextEditor;
      if (!active || active.document !== event.document) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        SvgPreviewPanel.currentPanel?.update(event.document.getText());
      }, 500);
    })
  );

  // Update preview when switching to a different editor tab
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (!SvgPreviewPanel.currentPanel || !editor) return;
      SvgPreviewPanel.currentPanel.update(editor.document.getText());
    })
  );

  // Also update on explicit save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      if (!SvgPreviewPanel.currentPanel) return;
      const active = vscode.window.activeTextEditor;
      if (active?.document === document) {
        SvgPreviewPanel.currentPanel.update(document.getText());
      }
    })
  );
}

function deactivate() {
  clearTimeout(debounceTimer);
}

module.exports = { activate, deactivate };
