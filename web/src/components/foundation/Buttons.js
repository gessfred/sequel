import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Buttons.css'

export function Button({icon, onClick, style, children}) {
  return (
    <button onClick={onClick} style={style}>
      <div>
        {icon && <FontAwesomeIcon icon={icon} />}
        {children}
      </div>
    </button>
  )
}

export function PictoButton({onClick}) {

}