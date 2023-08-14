import { useEffect, useState } from 'react'
import './Worksheet.css'
import { CodeEditor } from '../foundation/Code'
import { Table } from './Table'
import { execSql } from '../../utils/sql'
import * as _ from "lodash"
import { Button } from '../foundation/Buttons'

function SidebarRelation({name, data}) {
  return (
    <span>{name}</span>
  )
}

function SidebarSchema({name, data}) {
  const relations = data && _.groupBy(data, x => x[2])
  return (
    <div className='sidebar-element'>
      {name}
      {Object.entries(relations || {}).map(
        ([rel, data]) => <SidebarRelation name={rel} data={data} />
      )}
    </div>
  )
}

function SidbarCatalog({name, data}) {
  const schemas = data && _.groupBy(data, x => x[1])
  return (
    <div className='sidebar-element'>
      {name}
      {Object.entries(schemas || {}).map(
        ([schema, data]) => <SidebarSchema name={schema} data={data} />
      )}
    </div>
  )
}

function Sidebar({api, show, datasource, children}) {
  const [state, setState] = useState({})
  console.log(state)
  useEffect(() => {
    if(show)
      execSql(
        api, 
        "select table_catalog, table_schema, table_name, column_name, ordinal_position, data_type from information_schema.columns", 
        datasource, 
        (res) => {
          setState({information_schema: res})
        },
        (err) => console.warn(err)
      )
  }, [show])
  const catalogs = state.information_schema && _.groupBy(state.information_schema.rows, x => x[0])
  return (
    <div className='sidebar-wrapper'>
      <div className='sidebar-container'>
        Datasource {datasource}
        {Object.entries(catalogs || {}).map(([catalog, data]) => (
          <SidbarCatalog name={catalog} data={data} />
        ))}      
      </div>
      <div className='sidebar-outside'>
      {children}
      </div>
    </div>
  )
}

//TODO make in common this toolbar and the notebook's
export function Worksheet({api, data, show, datasource}) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState({})
  console.log(result)
  if(!show) return 
  return (
    <Sidebar api={api} datasource={data && data.datasource_id} show={show}>
      <div>
        <Button onClick={() => {
            console.log("exec sqé")
            execSql(
              api, 
              code, 
              datasource && data.datasource_id, 
              (res) => {
                setResult(res)
              },
              (err) => console.warn(err)
            )
          }}>
          Run
        </Button>
        <span>{result && result.duration} s</span>
      </div>
      <CodeEditor
        code={code}
        setCode={setCode}
      />
      <Table data={result}  />
    </Sidebar>
  )
}
