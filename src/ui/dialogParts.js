export function buildDialogParts(...candidates) {
  return candidates.filter((part, index, parts) => {
    if (!part) return false;
    return parts.indexOf(part) === index;
  });
}
