import { useRef, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { createTheme } from '@uiw/codemirror-themes'
import { sql } from '@codemirror/lang-sql'

function extractTextBetweenSemicolons(text, caretPos) {
  // Find the position of the semicolon before the caret
  let startPos = text.lastIndexOf(';', caretPos - 1);

  // If there is no semicolon before the caret, start from the beginning
  startPos = startPos === -1 ? 0 : startPos + 1;

  // Find the position of the semicolon after the caret
  let endPos = text.indexOf(';', caretPos);

  // If there is no semicolon after the caret, go to the end of the text
  endPos = endPos === -1 ? text.length : endPos;

  // Extract and return the text between the semicolons
  return text.substring(startPos, endPos);
}

const mainTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    backgroundImage: '',
    foreground: 'black',
    caret: '#5d00ff',
    selection: '#036dd626',
    selectionMatch: '#036dd626',
    lineHighlight: 'none',
    gutterBackground: 'white',
    gutterForeground: '#8a919966',
    gutterBorder: 'white',
    gutterActiveForeground: 'white',
    border: 'transparent',
    outline: 'white',
    fontWeight: 'bold'
  },
})

export function CodeEditor({code, setCode, onCtrlEnter}) {
  const editor = useRef()
  const handleCmdEnter = (event) => {
    console.log('cut @', window.getSelection())
    const {keyCode, ctrlKey}  = event
    if(ctrlKey && keyCode == 13) {
      console.log(window.getSelection().toString())
      const execode = extractTextBetweenSemicolons(code, window.getSelection().baseOffset)
      console.log("EXEC", execode)
      onCtrlEnter()
    } else {
      console.log(keyCode)
    }
  }
  useEffect(() => {
    console.log('REF', editor.current)
  }, [editor])
  return (
    <CodeMirror 
      value={code}
      onChange={(code, view) => {
        //console.log(code, view)
        console.log("exe", window.getSelection().baseNode.nodeValue, '->', extractTextBetweenSemicolons(code, window.getSelection().baseOffset))
        setCode(code)
      }}
      style={{outline: 'none', border: 'none'}}
      className='border-transparent'
      ref={editor}
      minHeight='100px'
      basicSetup={{
        lineNumbers: false,
        highlightActiveLine: false,
        foldGutter: false,
        rectangularSelection: false
      }}
      theme={mainTheme}
      extensions={[sql()]}
      options={{
        extraKeys: {
          'Ctrl-Enter': (cm) => console.log("ctrl+enter")
        }}}
      onKeyDown={handleCmdEnter}
        onSelect={e => console.log('SELECT', e)}
      autoFocus={true}
      onStatistics={(s) => console.log('statistics', s)}
    />
  )
}