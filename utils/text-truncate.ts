/**
 * Truncates a string in the middle with ellipses
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the result (including ellipses)
 * @param ellipsis - The ellipsis string to use (default: '...')
 * @returns Truncated string with ellipses in the middle
 */
export function truncateMiddle(
  text: string,
  maxLength: number,
  ellipsis: string = "...",
): string {
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= ellipsis.length) {
    return text.substring(0, maxLength);
  }

  const availableLength = maxLength - ellipsis.length;
  const startLength = Math.ceil(availableLength / 2);
  const endLength = Math.floor(availableLength / 2);

  const start = text.substring(0, startLength);
  const end = text.substring(text.length - endLength);

  return `${start}${ellipsis}${end}`;
}

/**
 * Truncates text based on available width, preserving words when possible
 * @param text - The text to truncate
 * @param maxLength - Maximum character length
 * @param ellipsis - The ellipsis string to use (default: '...')
 * @returns Truncated string
 */
export function truncateMiddleSmart(
  text: string,
  maxLength: number,
  ellipsis: string = "...",
): string {
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= ellipsis.length) {
    return text.substring(0, maxLength);
  }

  const availableLength = maxLength - ellipsis.length;
  
  // Try to find a word boundary near the middle
  const startTarget = Math.floor(availableLength / 2);
  const endTarget = text.length - Math.floor(availableLength / 2);

  // Find the nearest space before the start cut point
  let startIndex = startTarget;
  for (let i = startTarget; i > Math.max(0, startTarget - 10); i--) {
    if (text[i] === " " || text[i] === "-" || text[i] === "_" || text[i] === ".") {
      startIndex = i + 1;
      break;
    }
  }

  // Find the nearest space after the end cut point
  let endIndex = endTarget;
  for (let i = endTarget; i < Math.min(text.length, endTarget + 10); i++) {
    if (text[i] === " " || text[i] === "-" || text[i] === "_" || text[i] === ".") {
      endIndex = i;
      break;
    }
  }

  // Adjust if we need to maintain the max length
  const start = text.substring(0, startIndex);
  const end = text.substring(endIndex);
  const totalLength = start.length + ellipsis.length + end.length;

  if (totalLength > maxLength) {
    // Fall back to simple truncation if smart truncation doesn't fit
    return truncateMiddle(text, maxLength, ellipsis);
  }

  return `${start}${ellipsis}${end}`;
}


