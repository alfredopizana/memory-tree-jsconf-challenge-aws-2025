import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /día de los muertos memory tree/i })
    expect(heading).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<App />)
    const subtitle = screen.getByText(/family memory altar application/i)
    expect(subtitle).toBeInTheDocument()
  })
})