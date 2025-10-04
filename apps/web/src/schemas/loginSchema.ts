import z from "zod";

export const loginSchema = z.object({
    email: z.email("Digite um email válido")
        .min(1, "Informe seu email"),
    password: z
        .string({ error: "Digite sua senha" })
})