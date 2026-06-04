/**
 * Deriva a chave (Key) do objeto no R2 a partir da `url` salva em `File.url`.
 *
 * O campo pode guardar tanto a URL pública completa
 * (`https://.../files/abc.cdr`) quanto já a própria key (`files/abc.cdr`).
 * Em ambos os casos queremos a parte a partir de `files/`, que é o prefixo
 * usado no upload. Se `files/` não estiver presente, devolve a url original.
 */
export function deriveFileKey(url: string): string {
  const idx = url.indexOf('files/')
  return idx >= 0 ? url.substring(idx) : url
}
