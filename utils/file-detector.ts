export type FileType = 'gpx' | 'fit' | 'tcx' | 'unknown'

export function detectFileType(file: File): FileType {
  const extension = file.name.toLowerCase().split('.').pop()
  const mimeType = file.type.toLowerCase()

  if (extension === 'gpx' || mimeType.includes('gpx')) {
    return 'gpx'
  }

  if (extension === 'fit' || mimeType.includes('fit') || mimeType.includes('octet-stream')) {
    return 'fit'
  }

  if (extension === 'tcx' || mimeType.includes('tcx')) {
    return 'tcx'
  }

  if (mimeType.includes('xml')) {
    return 'unknown'
  }

  return 'unknown'
}

export function isSupportedFileType(file: File): boolean {
  const type = detectFileType(file)
  return type === 'gpx' || type === 'fit' || type === 'tcx'
}


