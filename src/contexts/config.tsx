import React, {createContext, useContext} from 'react'
import {LayoutProps} from 'sanity'
import {createHandler, deleteHandler, publishHandler, updateHandler} from '../eventListener'

export interface Config {
  onCreate?: createHandler
  onDelete?: deleteHandler
  onUpdate?: updateHandler
  onPublish?: publishHandler
}

const DocumentActionPropsContext = createContext<Config | undefined>(undefined)

type ConfigProviderProps = LayoutProps & {config: Config}

function ConfigProvider(props: ConfigProviderProps) {
  return (
    <DocumentActionPropsContext.Provider value={props.config}>
      {props.renderDefault(props)}
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
