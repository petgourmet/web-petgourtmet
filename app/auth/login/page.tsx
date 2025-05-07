import { AuthForm } from "@/components/auth/auth-form"
import { ThemedBackground } from "@/components/themed-background"

export default function LoginPage() {
  return (
    <ThemedBackground theme="default">
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuthForm />
      </div>
    </ThemedBackground>
  )
}
