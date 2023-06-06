import React, {createContext, ReactNode, useContext} from 'react'
import {createHandler, deleteHandler, publishHandler, updateHandler} from '../eventListener'

export interface Config {
  onCreate?: createHandler
  onDelete?: deleteHandler
  onUpdate?: updateHandler
  onPublish?: publishHandler
}

const DocumentActionPropsContext = createContext<Config | undefined>(undefined)

function ConfigProvider({children, value}: {children: ReactNode; value: Config}) {
  return (
    <DocumentActionPropsContext.Provider value={value}>
      {children}
    </DocumentActionPropsContext.Provider>
  )
}

function useConfig() {
  const context = useContext(DocumentActionPropsContext)
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}

export {ConfigProvider, useConfig}
