import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

const DEFAULT_XML = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="60" fill="#f97316" />
  <rect x="60" y="140" width="80" height="20" rx="4" fill="#1d4ed8" />
  <text x="100" y="108" text-anchor="middle" font-size="16" fill="white">Hello SVG</text>
</svg>`;

function applyXML(value, setPreview, setError, setIsDirty) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      setError(parseError.textContent.trim().split('\n')[0]);
      return false;
    }
    setError(null);
    setPreview(value);
    setIsDirty(false);
    return true;
  } catch (e) {
    setError(e.message);
    return false;
  }
}

export default function App() {
  const [editorValue, setEditorValue] = useState(DEFAULT_XML);
  const [preview, setPreview] = useState(DEFAULT_XML);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [bgMode, setBgMode] = useState('white'); // 'white' | 'black' | 'green'
  const editorRef = useRef(null);

  const refresh = useCallback(() => {
    setSpinning(true);
    applyXML(editorValue, setPreview, setError, setIsDirty);
    setTimeout(() => setSpinning(false), 400);
  }, [editorValue]);

  const save = useCallback(() => {
    applyXML(editorValue, setPreview, setError, setIsDirty);
  }, [editorValue]);

  // Auto-refresh: debounce 600ms after typing stops
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setTimeout(() => {
      applyXML(editorValue, setPreview, setError, setIsDirty);
    }, 600);
    return () => clearTimeout(timer);
  }, [editorValue, autoRefresh]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);

  const handleEditorChange = (value) => {
    setEditorValue(value || '');
    setIsDirty(true);
    setError(null);
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, save);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e1e' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        background: '#252526', borderBottom: '1px solid #3c3c3c', flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#cccccc', letterSpacing: 0.5 }}>
          SVG / XML Live Editor
        </span>
        <div style={{ flex: 1 }} />

        {error && (
          <span style={{
            fontSize: 12, color: '#f87171', maxWidth: 380,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={error}>
            ✕ {error}
          </span>
        )}

        {/* Auto-refresh toggle */}
        <div
          onClick={() => setAutoRefresh(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
          title="Toggle auto-refresh"
        >
          <div style={{
            width: 36, height: 20, borderRadius: 10, position: 'relative',
            background: autoRefresh ? '#0e7490' : '#4b5563', transition: 'background 0.2s',
          }}>
            <div style={{
              position: 'absolute', top: 2, left: autoRefresh ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Auto</span>
        </div>

        {/* Save button (only when auto is off) */}
        {!autoRefresh && (
          <button
            onClick={save}
            style={{
              padding: '5px 14px', borderRadius: 4, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: isDirty ? '#0e7490' : '#374151',
              color: isDirty ? '#fff' : '#9ca3af',
            }}
          >
            Save <kbd style={{ fontSize: 11, opacity: 0.7 }}>Ctrl+S</kbd>
          </button>
        )}
      </div>

      {/* Main panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor panel */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid #3c3c3c' }}>
          <div style={{
            padding: '4px 16px', fontSize: 11, color: '#858585',
            background: '#2d2d2d', borderBottom: '1px solid #3c3c3c', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>EDITOR</span>
            {isDirty && !autoRefresh && (
              <span style={{ color: '#f59e0b', fontSize: 10 }}>● unsaved</span>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              language="xml"
              value={editorValue}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                formatOnPaste: true,
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* Preview panel */}
        <div style={{ width: '50%', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '4px 16px', fontSize: 11, color: '#858585',
            background: '#2d2d2d', borderBottom: '1px solid #3c3c3c', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>PREVIEW</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* BG toggle */}
              <button
                onClick={() => setBgMode(m => m === 'white' ? 'black' : m === 'black' ? 'green' : 'white')}
                title={`Preview background: ${bgMode}`}
                style={{
                  background: bgMode === 'white' ? '#ffffff' : bgMode === 'black' ? '#000000' : '#14532d',
                  border: '1px solid #4b5563', borderRadius: 4,
                  color: bgMode === 'white' ? '#111' : '#fff', cursor: 'pointer', fontSize: 11, padding: '1px 7px',
                  lineHeight: 1.4,
                }}
              >
                {bgMode === 'white' ? 'White' : bgMode === 'black' ? 'Black' : 'Green'}
              </button>
            <button
              onClick={refresh}
              title="Refresh preview"
              style={{
                background: 'none', border: '1px solid #4b5563', borderRadius: 4,
                color: '#9ca3af', cursor: 'pointer', fontSize: 14, padding: '1px 7px',
                lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: spinning ? 'spin 0.4s linear' : 'none',
              }}>↻</span>
              <span style={{ fontSize: 11 }}>Refresh</span>
            </button>
            </div>
          </div>

          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'auto', position: 'relative',
            background: bgMode === 'black' ? '#000000' : bgMode === 'green' ? '#14532d' : '#ffffff',
            transition: 'background 0.2s',
          }}>
            <div
              className="svg-preview"
              style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .svg-preview svg { max-width: 100%; max-height: 100%; display: block; }
      `}</style>
    </div>
  );
}
