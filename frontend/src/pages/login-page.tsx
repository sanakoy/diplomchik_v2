import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { login } from '@/auth/actions'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { formatCountdown } from '@/lib/format'
import { useCountdown } from '@/lib/use-countdown'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Бэк ограничивает попытки входа: до этого момента кнопка заблокирована
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const secondsLeft = useCountdown(lockedUntil)
  const locked = secondsLeft > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await login(email, password)
    setPending(false)

    // При успехе GuestOnly сам уведёт на страницу, с которой пользователь пришёл
    if (result.ok) return
    if (result.reason === 'rate-limited') {
      setLockedUntil(Date.now() + result.retryAfterSeconds * 1000)
    } else if (result.reason === 'invalid-credentials') {
      setError('Неверный email или пароль.')
    } else {
      setError('Сервер не ответил. Попробуйте войти ещё раз.')
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold tracking-tight">Вход</h1>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FormField
          id="password"
          label="Пароль"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div role="alert" className="-mt-1 min-h-5 text-sm text-expense">
          {locked
            ? `Слишком много попыток. Войти можно через ${formatCountdown(secondsLeft)}.`
            : error}
        </div>

        {/* Кнопка недоступна, пока идёт запрос: повторный клик не отправит второй */}
        <Button type="submit" size="lg" className="h-11" disabled={pending || locked}>
          {pending ? 'Входим…' : 'Войти'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
          Зарегистрироваться
        </Link>
      </p>
    </AuthLayout>
  )
}
