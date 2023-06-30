import './Buttons.css'

export function Button({onClick, style, children}) {
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  )
}

export function PictoButton({onClick}) {

}