export function dateValueFormatter(params: { value: string | null | undefined }): string {
  if (!params.value) return '';
  return params.value;
}

export function dateValueParser(params: { newValue: string }): string {
  const value = params.newValue.trim();
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = value.match(dateRegex);
  if (match && match[1] && match[2] && match[3]) {
    return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
  }
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(value)) {
    return value;
  }
  return value;
}
