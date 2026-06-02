import { z } from 'zod'

// Schemas dos endpoints administrativos. Mesmo sendo rotas protegidas (ADMIN),
// limitar tamanho/charset evita inserir lixo no banco e dá erros 400 claros.

export const tagSchema = z.object({
  name: z.string().trim().min(1, 'Nome da tag é obrigatório').max(60, 'Nome muito longo'),
})

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(80, 'Nome muito longo'),
  // Cor opcional em formato hex (#fff ou #ffffff) — impede CSS/valor arbitrário.
  color: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Cor inválida (use formato hex)')
    .optional()
    .nullable()
    .or(z.literal('')),
})

export const userCreateSchema = z.object({
  name: z.string().trim().max(120, 'Nome muito longo').optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email('E-mail inválido').max(254, 'E-mail muito longo'),
  role: z.enum(['FASE', 'ADMIN']).default('FASE'),
  password: z
    .string()
    .min(8, 'Senha é obrigatória e deve ter ao menos 8 caracteres.')
    .max(200, 'Senha muito longa'),
})

// Schema para PATCH /api/admin/users/[id]: todos os campos opcionais.
// O limite de 200 chars na senha é crítico — scrypt em senhas enormes pode ser usado
// para saturar CPU (DoS). Validação deve ocorrer ANTES de chamar hashPassword.
export const userUpdateSchema = z.object({
  name: z.string().trim().max(120, 'Nome muito longo').nullable().optional(),
  role: z.enum(['FASE', 'ADMIN', 'VISITOR']).optional(),
  password: z
    .string()
    .min(8, 'A senha deve ter ao menos 8 caracteres.')
    .max(200, 'Senha muito longa')
    .optional(),
})

export type TagInput = z.infer<typeof tagSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
