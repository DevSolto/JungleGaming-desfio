import z from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .email("Digite um email válido")
    .min(1, "Informe seu email"),
  password: z.string({ required_error: "Digite sua senha" }),
})
