import { z } from 'zod'

// Auto-cadastro de clientes (role CLIENT). Equipe FASE/ADMIN continua sendo
// criada manualmente pelo admin — este schema é só para o cliente pagante.
export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome (mínimo 2 caracteres).')
    .max(120, 'Nome muito longo.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('E-mail inválido.')
    .max(254, 'E-mail muito longo.'),
  password: z
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .max(200, 'Senha muito longa.'),
})

export type RegisterInput = z.infer<typeof registerSchema>
