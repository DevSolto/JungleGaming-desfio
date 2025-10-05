import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { loginSchema } from "../../../schemas/loginSchema"
import { login } from "@/features/auth/login"
import { useState } from "react"


type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const [loginError, setLoginError]: [string, React.Dispatch<React.SetStateAction<string>>] = useState<string>('')

  const onSubmit = async (values: LoginFormValues) => {
    setLoginError('')
    const response = await login({ email: values.email, password: values.password });
    console.log('Login response:', response);
    if (typeof response == 'string') {
      setLoginError(typeof response === 'string' ? response : '');
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-border/60 bg-background/95 p-6 shadow-md backdrop-blur-sm">
      <header className="mb-6 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta informando email e senha cadastrados.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                  Usamos seu email para confirmar sua identidade.
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
                    autoComplete="current-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A senha deve ter no mínimo 8 caracteres.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <p>
            {loginError && <span className="text-sm text-red-600">{loginError}</span>}
          </p>

          <Button
            type="submit"
            className="w-full"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            Entrar
          </Button>
        </form>
      </Form>
    </div>
  )
}
