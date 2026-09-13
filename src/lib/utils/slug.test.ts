import { describe, it, expect } from 'vitest'
import { generateSlug } from './slug'

describe('generateSlug', () => {
  it.each([
    ['normaliza acentos', 'Coração', 'coracao'],
    ['converte maiúsculas', 'HELLO', 'hello'],
    ['substitui espaços por hífen', 'hello world', 'hello-world'],
    ['remove caracteres especiais', 'Olá, Mundo!', 'ola-mundo'],
    ['colapsa hífens repetidos', 'a---b', 'a-b'],
    ['remove hífens nas bordas', '-test-', 'test'],
    ['retorna vazio para string vazia', '', ''],
    ['trim antes de sluggificar', '  foo bar  ', 'foo-bar'],
    ['mantém hífens e underline', 'foo_bar-baz', 'foo_bar-baz'],
  ])('%s', (_label, input, expected) => {
    expect(generateSlug(input)).toBe(expected)
  })
})
