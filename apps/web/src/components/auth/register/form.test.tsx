import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { UserDTO } from '@repo/types'

const mockRegister = vi.fn<[
  { name: string; email: string; password: string },
], Promise<string | UserDTO>>()
const mockNavigate = vi.fn()

const getInputByLabel = (label: string) =>
  screen.getAllByLabelText(label)[0] as HTMLInputElement

vi.mock('@/features/auth/register', () => ({
  register: (...args: Parameters<typeof mockRegister>) => mockRegister(...args),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

import { RegisterForm } from './form'

describe('RegisterForm', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockNavigate.mockReset()
  })

  afterEach(() => {
    cleanup()
    mockRegister.mockReset()
    mockNavigate.mockReset()
  })

  it('mostra mensagens de validação para campos obrigatórios ou inválidos', async () => {
    render(<RegisterForm />)

    const nameInput = getInputByLabel('Nome')
    fireEvent.change(nameInput, { target: { value: 'Usuário' } })
    fireEvent.change(nameInput, { target: { value: '' } })

    await waitFor(() => {
      expect(screen.getByText('Informe seu nome')).toBeDefined()
    })

    const emailInput = getInputByLabel('Email')
    fireEvent.change(emailInput, { target: { value: 'invalido' } })

    await waitFor(() => {
      expect(screen.getByText('Digite um email válido')).toBeDefined()
    })

    const passwordInput = getInputByLabel('Senha')
    fireEvent.change(passwordInput, { target: { value: '123456' } })
    fireEvent.change(passwordInput, { target: { value: '' } })

    await waitFor(() => {
      expect(screen.getByText('Digite sua senha')).toBeDefined()
    })
  })

  it('valida o tamanho mínimo da senha', async () => {
    render(<RegisterForm />)

    fireEvent.change(getInputByLabel('Nome'), {
      target: { value: 'Usuário Teste' },
    })

    fireEvent.change(getInputByLabel('Email'), {
      target: { value: 'usuario@teste.com' },
    })

    const passwordInput = getInputByLabel('Senha')
    fireEvent.change(passwordInput, {
      target: { value: '123' },
    })
    fireEvent.blur(passwordInput)

    await waitFor(() => {
      expect(
        screen.getByText('A senha deve ter no mínimo 6 caracteres.'),
      ).toBeDefined()
    })
  })

  it('exibe mensagem de erro quando o cadastro falha', async () => {
    mockRegister.mockResolvedValueOnce('Email já cadastrado')

    render(<RegisterForm />)

    fireEvent.change(getInputByLabel('Nome'), {
      target: { value: 'Usuário Teste' },
    })
    fireEvent.change(getInputByLabel('Email'), {
      target: { value: 'usuario@teste.com' },
    })
    fireEvent.change(getInputByLabel('Senha'), {
      target: { value: 'segredo' },
    })

    const submitButton = screen.getByRole('button', { name: 'Cadastrar' }) as HTMLButtonElement

    await waitFor(() => {
      expect(submitButton.disabled).toBe(false)
    })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email já cadastrado')).toBeDefined()
    })
  })

  it('navega para a lista de tarefas quando o cadastro é bem-sucedido', async () => {
    mockRegister.mockResolvedValueOnce({
      id: 'user-1',
      name: 'Usuário Teste',
      email: 'usuario@teste.com',
    })

    render(<RegisterForm />)

    fireEvent.change(getInputByLabel('Nome'), {
      target: { value: 'Usuário Teste' },
    })
    fireEvent.change(getInputByLabel('Email'), {
      target: { value: 'usuario@teste.com' },
    })
    fireEvent.change(getInputByLabel('Senha'), {
      target: { value: 'segredo' },
    })

    const submitButton = screen.getByRole('button', { name: 'Cadastrar' }) as HTMLButtonElement

    await waitFor(() => {
      expect(submitButton.disabled).toBe(false)
    })

    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Usuário Teste',
        email: 'usuario@teste.com',
        password: 'segredo',
      })
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/tasks' })
    })

    expect(screen.queryByText('Email já cadastrado')).toBeNull()
  })
})
