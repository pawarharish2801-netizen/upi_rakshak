import { createContext, useContext, useState } from 'react'
import { motion } from 'framer-motion'

const TabsContext = createContext(null)

export function Tabs({
  children,
  defaultTab,
  value,
  onChange,
  className = '',
}) {
  const [internalTab, setInternalTab] = useState(defaultTab)
  const activeTab = value !== undefined ? value : internalTab

  const setActiveTab = (id) => {
    if (value === undefined) setInternalTab(id)
    if (onChange) onChange(id)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ children, className = '' }) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1 text-xs font-medium text-zinc-600 ${className}`}
    >
      {children}
    </div>
  )
}

export function Tab({ id, children, className = '' }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tab must be used within Tabs')
  const { activeTab, setActiveTab } = context
  const isActive = activeTab === id

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={`relative rounded-lg px-3 py-1.5 font-medium transition-colors outline-none select-none ${
        isActive
          ? 'text-[var(--color-brand-deep)] font-semibold'
          : 'text-zinc-600 hover:text-zinc-900'
      } ${className}`}
    >
      {isActive && (
        <motion.div
          layoutId="activeTabPill"
          className="absolute inset-0 rounded-lg bg-white shadow-sm"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

export function TabPanels({ children, className = '' }) {
  return <div className={`pt-2 ${className}`}>{children}</div>
}

export function TabPanel({ id, children, className = '' }) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabPanel must be used within Tabs')
  const { activeTab } = context

  if (activeTab !== id) return null

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

Tabs.List = TabList
Tabs.Tab = Tab
Tabs.Panels = TabPanels
Tabs.Panel = TabPanel
