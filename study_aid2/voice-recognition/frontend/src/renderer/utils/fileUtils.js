export const saveAsTxt = async (content, filename) => {
  try {
    if (!window.electronAPI) {
      throw new Error('Electron API不可用');
    }

    const result = await window.electronAPI.saveFile(content, filename);
    return result;
  } catch (err) {
    console.error('Error saving file:', err);
    throw err;
  }
};

export const downloadAsTxt = (content, filename) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
