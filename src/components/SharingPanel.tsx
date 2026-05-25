import { useRef, useState, type ChangeEvent } from 'react';
import { encodeShareHash, exportCsv, importCsv } from '../state/sharing';
import { useStore } from '../state/store';

export function SharingPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const panels = useStore((s) => s.panels);
  const stock = useStore((s) => s.stock);
  const options = useStore((s) => s.options);
  const unit = useStore((s) => s.unit);
  const projectName = useStore((s) => s.projectName);
  const importInputs = useStore((s) => s.importInputs);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      importInputs(importCsv(await file.text()));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import CSV.');
    }
  };

  const handleExport = () => {
    downloadText(
      `${safeFilename(projectName)}.csv`,
      'text/csv',
      exportCsv({ panels, stock }),
    );
  };

  const handleShare = async () => {
    const hash = encodeShareHash({ panels, stock, options, unit });
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    window.history.replaceState(null, '', hash);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      window.prompt('Share this URL', url);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <h2>Sharing</h2>
      </header>
      <div className="panel-stack">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={handleImport}
        />
        <div className="button-row">
          <button className="btn-sm" onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </button>
          <button className="btn-sm" onClick={handleExport}>
            Export CSV
          </button>
          <button className="btn-sm" onClick={handleShare}>
            {shareCopied ? 'Copied' : 'Share URL'}
          </button>
        </div>
      </div>
    </section>
  );
}

function downloadText(filename: string, mimeType: string, text: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string) {
  return name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'kingcut';
}
