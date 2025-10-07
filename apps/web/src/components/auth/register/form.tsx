import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { register as registerUser } from "@/features/auth/register"
import { registerSchema } from "@/schemas/registerSchema"


type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterForm() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  const [registerError, setRegisterError] = useState<string>("")

  const navigate = useNavigate()

  const onSubmit = async (values: RegisterFormValues) => {
    setRegisterError("")

    const response = await registerUser(values)

    if (typeof response === "string") {
      setRegisterError(response)
      return
    }

    navigate({ to: "/tasks" })
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-background/95 p-6 shadow-md backdrop-blur-sm">
      <header className="mb-6 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crie sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Informe seus dados para começar a organizar suas tarefas.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Como prefere ser chamado dentro da plataforma.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="nome@email.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Usaremos seu email para confirmar sua conta.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="********"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A senha deve ter no mínimo 6 caracteres.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <p>
            {registerError && <span className="text-sm text-red-600">{registerError}</span>}
          </p>

          <Button
            type="submit"
            className="w-full"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            Cadastrar
          </Button>
        </form>
      </Form>
    </div>
  )
}
