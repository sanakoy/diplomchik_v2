import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { register } from '@/auth/actions'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'

// Те же правила, что на бэке: от 8 символов и не длиннее 72 байт (лимит bcrypt)
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_BYTES = 72

function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов.`
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'Пароль слишком длинный: сократите его до 72 латинских символов или 36 русских.'
  }
  return null
}

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError(null)
    setFormError(null)

    const passwordProblem = validatePassword(password)
    setPasswordError(passwordProblem)
    if (passwordProblem) return

    setPending(true)
    const result = await register(email, password)
    setPending(false)

    // При успехе пользователь уже вошёл, и GuestOnly уведёт его в приложение
    if (result.ok) return
    if (result.reason === 'email-taken') {
      setEmailError('Этот email уже зарегистрирован. Войдите или укажите другой.')
    } else if (result.reason === 'invalid-email') {
      setEmailError('Проверьте email: в нём должны быть @ и домен.')
    } else if (result.reason === 'invalid-password') {
      setPasswordError('Пароль не подходит: от 8 символов и не длиннее 72 байт.')
    } else {
      setFormError('Сервер не ответил. Попробуйте ещё раз.')
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-semibold tracking-tight">Регистрация</h1>

      {/* noValidate: ошибки показываем своими словами, а не всплывающими подсказками браузера */}
      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={emailError ?? undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FormField
          id="password"
          label="Пароль"
          type="password"
          autoComplete="new-password"
          required
          hint={`Не короче ${PASSWORD_MIN_LENGTH} символов`}
          value={password}
          error={passwordError ?? undefined}
          onChange={(event) => setPassword(event.target.value)}
        />

        <div role="alert" className="-mt-1 min-h-5 text-sm text-expense">
          {formError}
        </div>

        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? 'Регистрируем…' : 'Зарегистрироваться'}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          Войти
        </Link>
      </p>
    </AuthLayout>
  )
}
