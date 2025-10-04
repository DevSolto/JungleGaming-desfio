import { LoginForm } from '@/components/auth/login/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth')({
  component: Index,
})

function Index() {
  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <Tabs defaultValue="login">
        <TabsList className="mb-4">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <LoginForm />
        </TabsContent>
        <TabsContent value="register">
          register
        </TabsContent>
      </Tabs>
    </main>
  )
}
