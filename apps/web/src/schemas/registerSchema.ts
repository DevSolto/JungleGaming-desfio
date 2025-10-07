import z from "zod"

export const registerSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  email: z
    .string()
    .min(1, "Informe seu email")
    .email("Digite um email válido"),
  password: z
    .string()
    .min(1, "Digite sua senha")
    .min(6, "A senha deve ter no mínimo 6 caracteres."),
})
