import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }) {
  const theme = 'dark'
  const [accent, setAccent] = useState(localStorage.getItem('accent') || 'blue')

  const accentMap = {
    blue: { main: '#2563eb', secondary: '#0ea5e9' },
    cyan: { main: '#06b6d4', secondary: '#38bdf8' },
    navy: { main: '#1d4ed8', secondary: '#1e3a8a' },
    emerald: { main: '#059669', secondary: '#0ea5e9' },
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'light') {
      document.body.style.background = '#f8fafc'
      document.body.style.color = '#0f172a'
    } else {
      document.body.style.background = '#030712'
      document.body.style.color = '#eff6ff'
    }
  }, [theme])

  useEffect(() => {
    const colors = accentMap[accent] || accentMap.blue
    document.documentElement.style.setProperty('--accent-primary', colors.main)
    document.documentElement.style.setProperty('--accent-secondary', colors.secondary)
    document.documentElement.style.setProperty('--accent-primary-dim', `${colors.main}1f`)
    document.documentElement.style.setProperty('--border-accent', `${colors.main}40`)
    document.documentElement.style.setProperty('--glow-accent', `0 0 40px ${colors.main}25`)
    document.documentElement.style.setProperty('--orange', colors.main)
    document.documentElement.style.setProperty('--accent-cyan', colors.main)
    document.documentElement.style.setProperty('--accent-purple', colors.secondary)
  }, [accent])

  const toggleTheme = () => {}

  const changeAccent = (value) => {
    setAccent(value)
    localStorage.setItem('accent', value)
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, changeAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}
