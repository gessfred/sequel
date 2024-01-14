import { useRef, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'

export function CodeEditor({code, setCode, onCtrlEnter}) {
  /*return (
    <div contentEditable={true} onInput={(e) => console.log(e.target.value)}>
      {code}
    </div>
  )*/
  //if(!onCtrlEnter) onCtrlEnter = () => {}
  const sqlEditorRef = useRef(null)
  useEffect(() => {
    if(sqlEditorRef.current) {
      console.log("attaching")
      const cm = sqlEditorRef.current
    cm.on('keydown', (editor, event) => {
      if (event.ctrlKey && event.keyCode === 13) { // 13 is the keyCode for Enter
        console.log("ctrl+key")
      }
    })
    }
  }, [])
  return (
    <CodeMirror 
      value={code}
      onChange={(code, view) => setCode(code)}
      height='500px'
      basicSetup={{lineNumbers: false}}
      extensions={[sql()]}
      options={{
        extraKeys: {
          'Ctrl-Enter': (cm) => console.log("ctrl+enter")
        }}}
    />
  )
}