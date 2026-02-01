/**
 * Detect file type from filename
 */
export function detectFileType(filename: string): 'pdf' | 'docx' | 'txt' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'pdf':
      return 'pdf'
    case 'docx':
      return 'docx'
    case 'txt':
      return 'txt'
    default:
      return 'unknown'
  }
}
